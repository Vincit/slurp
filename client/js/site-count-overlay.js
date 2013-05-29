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

(function(global) {
  "use strict";

  function SiteCountOverlay(map) {
    /* An associative array of L.Marker objects that are currently on the map.
     * Key: locality id, value: L.Marker object */
    this.countsOnMap = {};
    // Handle for the live query used for observing changes
    this.liveQuery = null;
    // Reference to Leaflet's map object
    this.map = map;

    this.localitiesSelector = {
      location: {$exists: true},
      siteCount: {$not: {$size: 0}}
    };

    Meteor.subscribe('localitiesWithSites');

    this.liveQuery = Localities.find(this.localitiesSelector).observe({
      added: _.bind(this._addCount, this),
      changed: _.bind(this._updateCount, this),
      removed: _.bind(this._removeCount, this)
    });

    this.map.on('zoomend', this._onZoomEnd, this);

    // The closest (largest numerically) zoom level to show the markers
    this.zoomThreshold = 9;

    this.onMarkerClick = _.bind(function(event) {
      var location = event.target._latlng;

      if (location) {
        this.map.setView(location, this.zoomThreshold + 1);
      }
    }, this);
  }

  SiteCountOverlay.prototype.isOverlayVisible = function() {
    return this.map.getZoom() <= this.zoomThreshold;
  };

  SiteCountOverlay.prototype._addCount = function(doc) {
    if (!this.isOverlayVisible()) return;

    if (doc.siteCount && doc.location) {
      var latlng = L.latLng(doc.location[1], doc.location[0]);
      var countIcon = L.divIcon({
        className: 'site-count-marker',
        html: '<div>' + doc.siteCount.toString() +
          '</div><i class="arrow"></i>',
        iconAnchor: [18, 42]
      });

      this.countsOnMap[doc._id] = L.marker(latlng, {
        clickable: true,
        icon: countIcon,
        keyboard: false,
        zIndexOffset: doc.siteCount,
        riseOnHover: true,
        riseOffset: 500
      }).addTo(this.map);

      this.countsOnMap[doc._id].on('click', this.onMarkerClick);
    }
  };

  SiteCountOverlay.prototype._updateCount = function(newDoc, oldDoc) {
    if (!newDoc.siteCount) return;

    if (newDoc.siteCount > 0) {
      if (this.countsOnMap[newDoc._id]) {
        this.countsOnMap[newDoc._id].setIcon(L.divIcon({
          className: 'site-count-marker',
          html: '<div>' + newDoc.siteCount.toString() +
            '</div><i class="arrow"></i>',
          iconAnchor: [18, 42]
        }));
      } else {
        this._addCount(newDoc);
      }
    } else {
      this._removeCount(newDoc);
    }
  };

  SiteCountOverlay.prototype._removeCount = function(oldDoc) {
    if (this.countsOnMap[oldDoc._id]) {
      this.countsOnMap[oldDoc._id].off('click', this.onMarkerClick);

      this.map.removeLayer(this.countsOnMap[oldDoc._id]);
      delete this.countsOnMap[oldDoc._id];
    }
  };

  SiteCountOverlay.prototype._onZoomEnd = function() {
    if (!this.isOverlayVisible()) {
      this._removeAllCounts();
      return;
    }

    // Readd counts to map if they should be shown but aren't.
    if ($.isEmptyObject(this.countsOnMap)) {
      this._addAllCounts();
    }
  };

  SiteCountOverlay.prototype._addAllCounts = function() {
    Localities.find(this.localitiesSelector).forEach(_.bind(function(doc) {
      this._addCount(doc);
      }, this));
  };

  SiteCountOverlay.prototype._removeAllCounts = function() {
    for (var key in this.countsOnMap) {
      this.map.removeLayer(this.countsOnMap[key]);
    }
    this.countsOnMap = {};
  };

  var siteCountOverlay = function(map) {
    return new SiteCountOverlay(map);
  };

  global.siteCountOverlay = siteCountOverlay;
})(this);
