/******************************************************************************
 *   Copyright 2013 Aleksi Grön                                               *
 *   Copyright 2013 Janne Koski                                               *
 *   Copyright 2013 Tommi Leinamo                                             *
 *   Copyright 2013 Lasse Liehu                                               *
 *                                                                            *
 *   This file is part of SLURP.                                              *
 *                                                                            *
 *   SLURP is free software: you can redistribute it and/or modify it         *
 *   under the terms of the GNU Affero General Public License as              *
 *   published by the Free Software Foundation, either version 3 of           *
 *   the License, or (at your option) any later version.                      *
 *                                                                            *
 *   SLURP is distributed in the hope that it will be useful,                 *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of           *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
 *   GNU Affero General Public License for more details.                      *
 *                                                                            *
 *   You should have received a copy of the GNU Affero General Public License *
 *   along with SLURP.  If not, see <http://www.gnu.org/licenses/>.           *
 ******************************************************************************/

/* Common base class for Route and Place. The term "site" is trying to be
 * a generic term for both routes and places. */
SiteOverlay = (function() {
  "use strict";

  var SiteOverlay = Class.extend({
    map: null,
    /* Id of the highlighted site, or null nothing is highlighted or if the
     * highlighted site is of different type than what this overlay handles. */
    highlightedSite: null,
    /* To keep a list of place layers currently on map so that they can be
     * easily removed. An associative array. Key is the site id and value
     * is the corresponding Leaflet layer object. */
    sitesOnMap: null,
    sitePreview: null, // Leaflet layer object. Used to preview archived site.
    siteCursor: null, // Meteor.Collection.Cursor object
    // A live query handle returned by Meteor.Collection.Cursor.observe
    siteQuery: null,

    /**
     * @param {Object} mapParam     A Leaflet L.Map object
     */
    init: function(mapParam) {
      this.map = mapParam;
      this.sitesOnMap = {};
      this._observeCallbacks = {
        added: _.bind(this._onSiteAdded, this),
        changed: _.bind(this._onSiteChanged, this),
        removed: _.bind(this._onSiteRemoved, this)
      };
      this.addQueue = new this.AddQueue(this);

      // _onZoomEnd should be implemented by subclasses.
      if (this._onZoomEnd)
        this.map.on('zoomend', this._onZoomEnd, this);

      Deps.autorun(_.bind(function(computation) {
        CategoryList.categoryDependency.depend();
        // No need to call the handler during the first run
        if (computation.firstRun) return;
        _.defer(_.bind(this._categorySelectionChanged, this));
      }, this));

      /* Handle site highlighting when selection changes.
       * Implemented by subclasses. */
      Deps.autorun(_.bind(function() {
        this._siteSelectionChanged(Session.get('siteDetailsId'));
      }, this));

      Deps.autorun(_.bind(function(computation) {
        // Makes this computation reactive
        Session.get('siteEditModeOn');

        // Do not call the handler on the first run
        if (computation.firstRun) return;

        if (this._editModeStatusChanged) {
          this._editModeStatusChanged();
        }
      }, this));
    },

    /**
     * A reactive data source.
     * @return Whether the overlay has added everything to map that it was
     *         asked to add to map. Meaning whether the add queue is empty. */
    ready: function() {
      return this.addQueue.empty();
    },

    shouldBeShownOnMap: function() {
      return this.map.getZoom() >= 10;
    },

    removeFromMap: function() {
      for (var i in this.sitesOnMap) {
        this.map.removeLayer(this.sitesOnMap[i]);
      }
      this.sitesOnMap = {};
      this.addQueue.clear();
    },

    removeSiteFromMap: function(siteId) {
      if (!siteId) return;

      // _onSiteRemove can be implemented by subclasses.
      if (this._onSiteRemove)
        this._onSiteRemove(siteId);

      if (this.sitesOnMap[siteId]) {
        this.map.removeLayer(this.sitesOnMap[siteId]);
        delete this.sitesOnMap[siteId];
      }
      this.addQueue.removeBySiteId(siteId);
    },

    /**
     * Adds a single site to the map.
     * @param {String|Object} site The site to add. If string, the parameter
     *                             is a site id and the site with that id is
     *                             fetched from the database. Otherwise
     *                             an existing Site object.
     * @param {Object} [options] A set of extra parameters.
     * @param {Boolean} [options.skipQueue=false]
     *        If true, the site is added to map directly. If false the site is
     *        added to the queue and then added to map asynchronously. This is
     *        sometimes useful to force a site to map because sites added to
     *        the queue might not be added to map if the whole overlay
     *        generally shouldn't be shown.
     */
    addSiteToMap: function(site, options) {
      if (!site) return;

      if (typeof site === 'string') {
        var siteId = site;
        site = Sites.findOne({_id: siteId});
        if (!site) {
          console.log('Could not find the site to add. Its id was: ' + siteId);
          return;
        }
      }
      if (options && options.skipQueue) {
        this._addSiteToMap(site);
      } else {
        this.addQueue.add(site);
      }
    },

    /**
     * Shows a preview based on archived site data.
     * Only one site preview can be shown at a time.
     * @param {Object} siteData Data to be shown in same format as
     *                          ArchivedSiteData collection entries.
     */
    showSitePreview: function(archivedData) {
      this.removeSitePreview();
      /* _showSitePreview is implemented by subclasses and should check that
       * the site is of the correct type. */
      this._showSitePreview(archivedData);
    },

    removeSitePreview: function() {
      if (this.sitePreview) {
        this.map.removeLayer(this.sitePreview);
        delete this.sitePreview;
      }
    },

    /**
     * When this function is called, 'this' should be an object containing key
     * 'siteId', which should be the id of the clicked site.
     */
    _onClicked: function() {
      if (!Session.get('siteEditModeOn')) {
        if (this.overlay.highlightedSite === this.siteId &&
            Session.equals('detailViewState', 'peek')) {
          pagejs('/site/' + this.siteId + '/general');
        } else {
          pagejs("/site/" + this.siteId + "/peek");
        }
      }
    },

    _categorySelectionChanged: function() {
      if (!this.siteCursor) return;

      this.siteCursor.forEach(_.bind(function(site) {
        var hide = this._hideSiteByCategoryFilter(site);
        if (this.sitesOnMap[site._id]) {
          if (hide) {
            // Remove if currently visible and should not be.
            this.removeSiteFromMap(site._id);
          }
        } else if (!hide) {
          // Add if currently not visible and should be.
          this.addSiteToMap(site);
        }
      }, this));
      this.siteCursor.rewind();
    },

    /**
     * This can be used by derived classes to do filtering by categories.
     * @param {Object} site A site object (see models)
     * @return True if the site doesn't belong to the filtered set.
     *         False otherwise.
     */
    _hideSiteByCategoryFilter: function(site) {
      if (CategoryList.selectedCategories.length > 0) {
        var categories = CategoryList.selectedCategories;
        var found = false;
        for (var i = 0; i < categories.length; ++i) {
          if ((categories[i] === 'other' && site.categories.length === 0) ||
              site.categories.indexOf(categories[i]) !== -1) {
            found = true;
            break;
          }
        }
        return !found;
      } else {
        return false;
      }
    },

    /**
     * 'added' callback for Meteor.Collection.Cursor.observe
     * @param {Object} site A site document (see models)
     */
    _onSiteAdded: function(site) {
      this.addSiteToMap(site);
    },

    /**
     * 'changed' callback for Meteor.Collection.Cursor.observe
     * @param {Object} newSite The current contents of the site document
     * @param {Object} oldSite The previous contents of the site document
     */
    _onSiteChanged: function(newSite, oldSite) {
      this.removeSiteFromMap(newSite._id);
      /* Skip queue to prevent possible flicker. As this callback is run quite
       * rarely, this shouldn't have much of a performance hit. */
      this.addSiteToMap(newSite, {skipQueue: true});
    },

    /**
     * 'removed' callback for Meteor.Collection.Cursor.observe
     * @param {Object} site A site document (see models)
     */
    _onSiteRemoved: function(site) {
      this.removeSiteFromMap(site._id);
    },

    /**
     * A queue-like data structure for adding sites to an overlay (and to map)
     * asynchronously in the background. Even though this is named "queue",
     * the FIFO (First In, First Out) principle isn't followed because
     * the order of adding doesn't matter much and performance can be better
     * without following it. For example when removing a site from the queue
     * before it has been added.
     */
    AddQueue: Class.extend({
      init: function(overlay) {
        /* An associative array of sites to add to the map
         * Key: site id, value: Site object
         * Rationale for this data structure: it's quick to add and remove keys
         * and also check the existence of a key.
         */
        this.queue = {};
        this._overlay = overlay;
        this._processingQueue = false;
        this._emptyDependency = new Deps.Dependency();
        this._previousEmptyValue = false;
      },

      /**
       * Starts to process the add queue if processing it is not already in
       * progress. Processing means going through the list and adding the sites
       * to the map. Processing is done asynchronously in the background.
       */
      process: function() {
        if (this._processingQueue) return;

        this._processingQueue = true;
        _.defer(_.bind(this._processSome, this));
      },

      _processSome: function() {
        if (this._overlay.currentlyHidden) {
          this._processingQueue = false;
          this.clear();
          return;
        }

        var LIMIT = 10;
        var i = 0;
        for (var key in this.queue) {
          var place = this.queue[key];
          if (!this._overlay.sitesOnMap[place._id]) {
            this._overlay._addSiteToMap(place);
          }
          delete this.queue[key];

          // Ensure that only LIMIT sites are added in one go.
          i++;
          if (i === LIMIT) {
            break;
          }
        }
        this._updateEmptyDependency();
        if (!$.isEmptyObject(this.queue)) {
          _.defer(_.bind(this._processSome, this));
        } else {
          this._processingQueue = false;
        }
      },

      /**
       * Clears the queue, making it empty.
       */
      clear: function() {
        this.queue = {};
        this._updateEmptyDependency();
      },

      /**
       * @param {String} siteId The id of the site to remove from the queue
       */
      removeBySiteId: function(siteId) {
        if (this.queue[siteId]) {
          delete this.queue[siteId];
          this._updateEmptyDependency();
        }
      },

      /**
       * Adds a site to the list of sites to add and then automatically starts
       * processing the queue in the background.
       * @param {Object} site The site to add
       */
      add: function(site) {
        this.queue[site._id] = site;
        this._updateEmptyDependency();
        this.process();
      },

      /**
       * A reactive data source.
       * @return True if the queue is empty. False otherwise. */
      empty: function() {
        this._emptyDependency.depend();
        return $.isEmptyObject(this.queue);
      },

      /**
       * An internal function that needs to be called every time the length of
       * the add queue might have changed.
       */
      _updateEmptyDependency: function() {
        var emptyValue = $.isEmptyObject(this.queue);
        if (emptyValue !== this._previousEmptyValue) {
          this._previousEmptyValue = emptyValue;
          this._emptyDependency.changed();
        }
      }
    })
  });

  return SiteOverlay;
})();
