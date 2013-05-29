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

RouteOverlay = (function() {
  "use strict";

  var RouteOverlay = SiteOverlay.extend({
    /* An associative array, where keys are route Ids and values are strings.
     * See _getRouteDisplayMode function for possible string values. */
    displayModes: null,

    init: function(mapParam) {
      this._super(mapParam);
      this.displayModes = {};
      this.siteCursor = Sites.find({routeData: {$exists: true}});
      this.siteQuery = this.siteCursor.observe(this._observeCallbacks);
    },

    /**
     * Adds routes to map.
     */
    addToMap: function() {
      // Find sites that represent routes.
      Sites.find({routeData: {$exists: true}}).forEach(_.bind(function(route) {
        this.addSiteToMap(route);
      }, this));

      /* This is necessary because the highlighted site is placed on top of
       * the preview site when overlays are recreated. */
      if (this.sitePreview)
        this.sitePreview.bringToFront();
    },

    /**
     * Internal function that implements adding a single route to the map.
     * @param {Object} route The complete route object. The object must have
     *                       an _id property and the route must be persisted in
     *                       the database with that id.
     */
    _addSiteToMap: function(route) {
      Deps.nonreactive(_.bind(function() {
        if (!route || !route.routeData) return;

        // Don't show route if it's hidden by category filter or being edited.
        if (routeEditor.editedRouteId === route._id ||
            this._hideSiteByCategoryFilter(route)) {
          return;
        }

        var routeLayer = null;

        var displayMode = this._getRouteDisplayMode(route);
        this.displayModes[route._id] = displayMode;
        if (displayMode === 'full') {
          routeLayer = L.geoJson(
            route.routeData, {style: this._getPolylineStyle(route._id)});
        } else if (displayMode === 'marker') {
          var latlng = MapUtilities.geoJsonPointToLatLng(route.location);
          routeLayer = L.marker(latlng, {
            clickable: Session.get('siteEditModeOn') ? false : true
          });
          this._setRouteMarkerOptions(routeLayer, route._id);
        }

        if (routeLayer) {
          routeLayer.on('click', this._onClicked, {siteId: route._id, overlay: this});
          routeLayer.addTo(this.map);

          this.sitesOnMap[route._id] = routeLayer;
        }
      }, this));
    },

    _showSitePreview: function(data) {
      if (!data.routeData) return;

      this.sitePreview = L.geoJson(data.routeData, {style: {
        weight: 7,
        color: PolylineOptions.previewColor,
        dashArray: [7, 12],
        opacity: PolylineOptions.previewOpacity
      }});

      if (this.sitePreview) {
        this.sitePreview.addTo(this.map);
        this.sitePreview.bringToFront();
      }
    },

    _siteSelectionChanged: function(siteId) {
      if (siteId === this.highlightedSite) return;

      // Remove highlight from previously highlighted route (if there is one)
      if (this.highlightedSite) {
        this._setRouteHighlight(this.highlightedSite, false);
      }

      // If another route was selected, highlight it
      var isRoute = Sites.findOne({_id: siteId, routeData: {$exists: true}});

      if (siteId && isRoute) {
        this._setRouteHighlight(siteId, true);
      }
    },

    _editModeStatusChanged: function() {
      Sites.find({routeData: {$exists: true}}, {reactive: false}).forEach(
          _.bind(function(route) {

        var displayMode = this._getRouteDisplayMode(route);

        if (displayMode !== 'hidden') {
          this.removeSiteFromMap(route._id);
          // Skip queue to avoid the user seeing how everything is readded.
          this.addSiteToMap(route, {skipQueue: true});
        }
      }, this));
    },

    _getPolylineStyle: function(routeId) {
      var style = null;
      Deps.nonreactive(_.bind(function() {
        style = {
          clickable: Session.get('siteEditModeOn') ? false : true,
          weight: 10,
          color: routeId === this.highlightedSite ?
            PolylineOptions.highlightColor : PolylineOptions.defaultColor,
          opacity: routeId === this.highlightedSite ?
            PolylineOptions.highlightOpacity : PolylineOptions.opacity
        };
      }, this));
      return style;
    },

    _setRouteHighlight: function(routeId, isHighlighted) {
      if (routeId) {
        this.highlightedSite = isHighlighted ? routeId : null;
        var displayMode = this._getRouteDisplayMode(Sites.findOne(routeId));

        var oldRoute = this.sitesOnMap[routeId];
        if (!oldRoute) return;

        /* Change only route color/icon if possible (ie. if route type didn't
         * change). Otherwise delete the route from map and add it back */
        if (displayMode === 'full' && oldRoute instanceof L.GeoJSON) {
          oldRoute.setStyle(
            L.setOptions(oldRoute, this._getPolylineStyle(routeId)));

          if (isHighlighted) oldRoute.bringToFront();

        } else if (displayMode === 'marker' && oldRoute instanceof L.Marker) {
          this._setRouteMarkerOptions(oldRoute, routeId);
        } else {
          this.removeSiteFromMap(routeId);
          // Skip queue to prevent flicker.
          this.addSiteToMap(routeId, {skipQueue: true});
        }
      }
    },

    _setRouteMarkerOptions: function(marker, routeId) {
      var isHighlighted = routeId === this.highlightedSite;
      marker.setIcon(L.icon(isHighlighted ?
                            MarkerIconOptions.highlightedMarker :
                            MarkerIconOptions.routeMarker));

      if (isHighlighted) {
        marker.setZIndexOffset(9001); // Bring marker to front.
      } else {
        marker.setZIndexOffset(0);
      }
    },

    /**
     * Tells how a specific route should be displayed. Also checks highlighting.
     * @param  {Object} route Site object as defined in Sites collection. Must
     *                        represent a route.
     * @return {String}       Either 'full', 'marker', 'hidden' or 'invalid'
     */
    _getRouteDisplayMode: function(route) {
      if (!route)
        return 'invalid';

      // Display highlighted route as polyline regardless of zoom level
      if (route._id === this.highlightedSite)
        return 'full';

      if (!this.shouldBeShownOnMap())
        return 'hidden';

      /* Show markers if the route takes small enough space on screen and
       * zoom level is low enough. */
      if (this.map.getZoom() <= 14) {
        var mapBounds = this.map.getBounds();

        var coordinates = route.area.coordinates[0];
        var northEast = new L.LatLng(coordinates[1][1], coordinates[1][0]);
        var southWest = new L.LatLng(coordinates[3][1], coordinates[3][0]);
        var routeDiam = northEast.distanceTo(southWest);
        var mapDiam = mapBounds.getNorthEast().
          distanceTo(mapBounds.getSouthWest());
        var routeSizeFactor = routeDiam / mapDiam;

        if (routeSizeFactor < 0.05)
          return 'marker';
      }

      return 'full';
    },

    /**
     * Called from base class right before the site is deleted.
     * @param  {String} siteId Id of the deleted site.
     */
    _onSiteRemove: function(siteId) {
      if (this.displayModes[siteId]) {
        delete this.displayModes[siteId];
      }
    },

    // Redraw or hide routes if needed when zoom level changes.
    _onZoomEnd: function() {
      _.defer(_.bind(function() {
        for (var routeId in this.displayModes) {
          var route = Sites.findOne(routeId);
          if (this.displayModes[routeId] !== this._getRouteDisplayMode(route)) {
            this.removeSiteFromMap(routeId);
            this.addSiteToMap(route);
          }
        }
      }, this));
    }
  });

  return RouteOverlay;
})();
