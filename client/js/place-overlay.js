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

PlaceOverlay = (function() {
  "use strict";

  var PlaceOverlay = SiteOverlay.extend({
    init: function(mapParam) {
      this._super(mapParam);
      this.siteCursor = Sites.find({location: {$exists: true},
                                    routeData: {$exists: false}});
      this.siteQuery = this.siteCursor.observe(this._observeCallbacks);
      this.currentlyHidden = !this.shouldBeShownOnMap();
    },

    /**
     * Adds places to map.
     */
    addToMap: function() {
      // Insert all places to the add queue
      var sitesToAdd = Sites.find({
        routeData: {$exists: false}},
        {reactive: false}
      ).forEach(_.bind(function(place) {
        this.addSiteToMap(place);
      }, this));
    },

    _siteSelectionChanged: function(siteId) {
      if (siteId === this.highlightedSite) return;

      // Remove highlight from previously highlighted place (if there is one)
      if (this.highlightedSite) {
        this._setPlaceHighlight(this.highlightedSite, false);
      }

      // If another place was selected, highlight it
      var isPlace = Sites.findOne({_id: siteId, routeData: {$exists: false}});

      if (siteId && isPlace) {
        this._setPlaceHighlight(siteId, true);
      }
    },

    _editModeStatusChanged: function() {
      var selector = {location: {$exists: true}, routeData: {$exists: false}};
      Sites.find(selector, {reactive: false}).forEach(_.bind(function(place) {

        if (!this.shouldBeShownOnMap()) return;

        this.removeSiteFromMap(place._id);
        // Skip queue to avoid the user seeing how everything is readded.
        this.addSiteToMap(place, {skipQueue: true});
      }, this));
    },

    _addSiteToMap: function(place) {
      Deps.nonreactive(_.bind(function() {
        if (!place || place.routeData) return;

        // Don't add the place that is currently being edited to the map
        if (placeEditor.editedPlaceId === place._id) return;

        // Don't add the place twice
        if (this.sitesOnMap[place._id]) return;

        // Highlighted place should always be displayed regardless of zoom level
        if (place._id !== this.highlightedSite && !this.shouldBeShownOnMap())
          return;

        if (this._hideSiteByCategoryFilter(place)) return;

        var latlng = MapUtilities.geoJsonPointToLatLng(place.location);

        var placeMarker = L.marker(latlng, {
          clickable: Session.get('siteEditModeOn') ? false : true,
          zIndexOffset: this.highlightedSite === place._id ? 9001 : 0,
          icon: L.icon(this.highlightedSite === place._id ?
                      MarkerIconOptions.highlightedMarker :
                      MarkerIconOptions.defaultMarker)
        });

        placeMarker.on('click', this._onClicked, {
          siteId: place._id,
          overlay: this});
        placeMarker.addTo(this.map);

        this.sitesOnMap[place._id] = placeMarker;
      }, this));
    },

    _showSitePreview: function(data) {
      if (data.routeData) return;

      if (this._showSitePreview.intervalId)
        window.clearInterval(this._showSitePreview.intervalId);

      this.sitePreview = L.marker(
        MapUtilities.geoJsonPointToLatLng(data.location),
        {clickable: false, icon: L.icon(MarkerIconOptions.previewMarker)}
      );

      this.sitePreview.addTo(this.map);

      // Toggle whether the highlighted marker or preview marker is on top.
      this._showSitePreview.intervalId = window.setInterval(_.bind(function() {
        var onFront = false;
        return _.bind(function() {
          if (this.sitePreview) {
            this.sitePreview.setZIndexOffset(onFront ? 9900 : 7000);
            onFront = !onFront;
          } else {
            window.clearInterval(this._showSitePreview.intervalId);
          }
        }, this);
      }, this)(), 850);
    },

    _setPlaceHighlight: function(placeId, isHighlighted) {
      if (placeId) {
        this.highlightedSite = isHighlighted ? placeId : null;

        var oldPlace = this.sitesOnMap[placeId];
        if (!oldPlace) return;

        if (isHighlighted) {
          oldPlace.setIcon(L.icon(MarkerIconOptions.highlightedMarker));
          oldPlace.setZIndexOffset(9001); // Bring marker to front.
        } else if (this.shouldBeShownOnMap()) {
          oldPlace.setIcon(L.icon(MarkerIconOptions.defaultMarker));
          oldPlace.setZIndexOffset(0);
        } else {
          this.removeSiteFromMap(placeId);
        }
      }
    },

    _onZoomEnd: function() {
      _.defer(_.bind(function() {
        if (!this.shouldBeShownOnMap()) {
          this.currentlyHidden = true;
          this.removeFromMap();
          // Always show highlighted place regardless of zoom level
          if (this.highlightedSite)
            this.addSiteToMap(this.highlightedSite, {skipQueue: true});
          return;
        }

        // Readd places to map if they should be shown but aren't.
        if (this.currentlyHidden) {
          this.currentlyHidden = false;
          this.addToMap();
        }
      }, this));
    }
  });

  return PlaceOverlay;
})();
