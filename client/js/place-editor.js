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

PlaceEditor = (function() {
  "use strict";

  var PlaceEditor = SiteEditor.extend({
    editedPlaceId: null,
    editedPlaceMarker: null,
    populatePlaceDataWatch: null,

    startAdd: function() {
      this.sightModeOn = Utilities.isTouchDevice();
      this._stopWatches();

      // Load place data when it becomes available.
      this.populatePlaceDataWatch = Deps.autorun(_.bind(function() {
        this._populatePlaceEditData();
      }, this));

      // In case the computation was successful on the first run.
      if (this.populatePlaceDataWatch.stopped)
        this.populatePlaceDataWatch = null;

      this.editModeOn = true;
    },

    /**
     * Moves edited place to new location.
     * @param  {Object} [latlng] Leaflet LatLng object. If not given, the sight
     *                           location will be used instead.
     */
    updatePlaceLocation: function(latlng) {
      if (!latlng) {
        latlng = this._getSightLatLng();
      }

      if (!this.editedPlaceMarker) {
        this.editedPlaceMarker = L.marker(latlng, {
          draggable: 'true',
          icon: L.icon(MarkerIconOptions.highlightedMarker)
        });

        this.editedPlaceMarker.on('drag', this._onMarkerDrag, this);
        this.editedPlaceMarker.addTo(this.map);
      } else {
        this.editedPlaceMarker.setLatLng(latlng);
      }
    },

    /**
     * Persists changes made in the edit mode, either by saving changes
     * to an existing place or adding a new place.
     *
     * If the operation was successful, exits the edit mode. Otherwise this
     * function has no effect. Note that this function is only meant to save
     * the changes and not to just exit edit mode or discard the changes. Also
     * note that this operation can be successful even if the validation of
     * the changes will fail on the server-side.
     *
     * @param {Function} callback function to be called when operation finishes.
     *                            Takes siteId as a parameter, which is the id
     *                            of the updated/inserted site if operation was
     *                            successful, otherwise null or undefined.
     */
    saveAndExitEditMode: function(callback) {
      var siteServiceCallback = _.bind(function(siteId) {
        if (siteId) {
          this.exitEditMode();
        }
        callback(siteId);
      }, this);

      if (this.editedPlaceMarker) {
        var newPlace = {name: '', description: '', categories: []};

        var placeLatLng = this.editedPlaceMarker.getLatLng();
        var geoJSON = {
          type: 'Point',
          coordinates: [placeLatLng.lng, placeLatLng.lat]
        };
        newPlace.location = geoJSON;

        if (this.editedPlaceId) {
          SiteService.update(Session.get('siteDetailsId'),
                             {$set: {location: newPlace.location}},
                             siteServiceCallback);
        } else {
          SiteService.insert(newPlace, siteServiceCallback);
        }
      }
    },

    exitEditMode: function(redirectToFrontPage) {
      this._stopWatches();
      this._resetEditState();

      this.map.off('click', this._onMapClick, this);
      this.editModeOn = false;

      if (redirectToFrontPage) pagejs('/');
    },

    _resetEditState: function() {
      if (this.editedPlaceMarker)
        this.map.removeLayer(this.editedPlaceMarker);
      this.editedPlaceMarker = null;

      /* Readd the place that was being edited. This is needed because it was
       * removed from the map when editing it began. */
      if (this.editedPlaceId) {
        /* Reset the editedPlaceId before readding it, because edited place
         * can not be added. */
        var placeToAdd = this.editedPlaceId;
        this.editedPlaceId = null;
        placeOverlay.addSiteToMap(placeToAdd);
      }
    },

    // Set marker to edited place location when its data becomes available
    _populatePlaceEditData: function() {
      var currentSiteId = Session.get('siteDetailsId');
      var currentPlace = Sites.findOne(
        {_id: currentSiteId, 'routeData': {$exists: false}});

      if (currentSiteId && currentPlace) {
        this._resetEditState();
        this.editedPlaceId = currentSiteId;

        // Hide place from map, so that it won't be shown twice
        placeOverlay.removeSiteFromMap(currentSiteId);

        this.updatePlaceLocation(
          MapUtilities.geoJsonPointToLatLng(currentPlace.location));
      }

      if (!currentSiteId || currentPlace) {
        if (!this.editedPlaceMarker)
          this.updatePlaceLocation(this.map.getCenter());

        this.map.on('click', this._onMapClick, this);

        Deps.currentComputation.stop();
        this.populatePlaceDataWatch = null;

        this.editModeOn = true;
      }
    },

    _stopWatches: function() {
      if (this.populatePlaceDataWatch)
        this.populatePlaceDataWatch.stop();
      this.populatePlaceDataWatch = null;
    },

    /**
     * Internal event handler function that is not an anonymous function so
     * that the handler can be easily removed with the off function of
     * Leaflet's event powered classes.
     */
    _onMapClick: function(e) {
      if (this.sightModeOn) {
        this.map.panTo(e.latlng);
      } else {
        this.updatePlaceLocation(e.latlng);
      }
    },

    _onMarkerDrag: function(e) {
      this.updatePlaceLocation(e.target.getLatLng());
    }
  });

  return PlaceEditor;
})();
