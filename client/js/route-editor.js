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

RouteEditor = (function() {
  "use strict";

  var RouteEditor = SiteEditor.extend({
    // An ordered list of [lng, lat, alt] objects (alt is optional)
    pathCoords: [],
    polyline: null,
    markers: [],
    editedRouteId: null,
    selectedNodeIndex: null,
    selectedNodeHighlights: {
      currentPart: null, // Path from selected node to next node
      tailGhost: null, // Path from selected node to cursor
      headGhost: null, // Path from cursor to next node
      // False if ghost drawing is disabled (eg. when hovering a marker)
      ghostsVisible: true
    },
    hoveredMarker: null, // Marker object that is being hovered
    markerDragOn: false, // Used to disable ghost lines while dragging

    init: function(mapParam) {
      this._super(mapParam); // Call the base class constructor.
    },

    /**
     * Switches the map into a mode where a new route can be added by clicking
     * on it.
     */
    startAdd: function() {
      if (!this.editModeOn) {
        this.sightModeOn = Utilities.isTouchDevice();

        this.map.on('click', this._onMapClick, this);
        if (this.sightModeOn) {
          this.map.on('move', this._onMapMove, this);
        } else {
          this.map.on('mousemove', this._onMapMove, this);
          this.map.on('mouseout', this._hideSelectionGhosts, this);
          this.map.on('mouseover', this._showSelectionGhosts, this);
        }
      }
      this._stopWatches();

      // Load route data when it becomes available.
      this.populateRouteDataWatch = Deps.autorun(_.bind(function() {
        this._populateRouteEditData();
      }, this));

      // In case the computation was successful on the first run.
      if (this.populateRouteDataWatch.stopped)
        this.populateRouteDataWatch = null;

      Session.set('siteEditModeOn', true);
      this.editModeOn = true;
    },

    /**
     * Adds new points after the selected point in route that is being added or
     * edited. Selection is also changed to the last added point.
     * @param {Array} points Array of [lng, lat, alt] arrays (alt is optional)
     * All properties are optional.
     */
    addPointsToRoute: function(points) {
      this._removeSelectionGhosts();

      for (var i = 0; i < points.length; i++) {
        var point = points[i];

        var marker = L.marker(this._coordsToLatLng(point), {
          draggable: 'true',
          riseOnHover: true,
          riseOffset: 7000
        });

        marker.addTo(this.map);

        this._setSelectedNodeHighlight(false);

        this._setMarkerEventMethods(marker);

        if (typeof this.selectedNodeIndex !== 'number' ||
            this.selectedNodeIndex === this.pathCoords.length-1) {
          this.selectedNodeIndex = this.pathCoords.length;
          this.pathCoords.push(point);
          this.markers.push(marker);
        } else {
          ++this.selectedNodeIndex;
          this.pathCoords.splice(this.selectedNodeIndex, 0, point);
          this.markers.splice(this.selectedNodeIndex, 0, marker);
        }

      }

      this.redrawEditedRoute();
      this._setSelectedNodeHighlight(true);
    },

    addPointToSightLocation: function() {
      var latLng = this._getSightLatLng();
      if (latLng)
        this.addPointsToRoute([[latLng.lng, latLng.lat]]);
    },

    /**
     * Removes the currently selected point from the route that is being added
     * or edited. The selection is changed to the previous point after remove.
     */
    removeSelectedPoint: function() {
      if (this.pathCoords.length === 0) {
        return;
      }

      if (this.selectedNodeIndex === this.pathCoords.length-1) {
        this.pathCoords.pop();
        this.map.removeLayer(this.markers[this.markers.length-1]);
        this.markers.pop();
      } else {
        this.pathCoords.splice(this.selectedNodeIndex, 1);
        this.map.removeLayer(this.markers[this.selectedNodeIndex]);
        this.markers.splice(this.selectedNodeIndex, 1);
      }

      if (this.selectedNodeIndex > 0) {
        --this.selectedNodeIndex;
      }

      if (this.pathCoords.length === 0) {
        this.selectedNodeIndex = null;
      } else {
        this._setSelectedNodeHighlight(true);
      }

      this.redrawEditedRoute();
    },

    /**
     * Persists changes made in the edit mode, either by saving changes
     * to an existing route or adding a new route.
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
      var routeIsNew = Boolean(!this.editedRouteId);
      var siteServiceCallback = _.bind(function(siteId) {
        if (siteId) {
          this.exitEditMode();
        }
        callback(siteId);
      }, this);

      if (this.pathCoords.length > 1) {
        var route = {name: '', description: '', categories: [],
          routeData: {type: 'LineString', coordinates: this.pathCoords}};

        if (routeIsNew) {
          SiteService.insert(route, siteServiceCallback);
        } else {
          SiteService.update(Session.get('siteDetailsId'),
                             {$set: {routeData: route.routeData}},
                             siteServiceCallback);
        }
      } else {
        callback();
      }
    },

    exitEditMode: function(redirectToFrontPage) {
      this._stopWatches();
      this._resetEditState();
      this.map.off('click', this._onMapClick, this);
      this.map.off('move', this._onMapMove, this);
      this.map.off('mousemove', this._onMapMove, this);
      this.map.off('mouseout', this._hideSelectionGhosts, this);
      this.map.off('mouseover', this._showSelectionGhosts, this);
      this.editModeOn = false;
      /* This must be reset because the user might exit edit mode while
       * dragging a marker. */
      this.markerDragOn = false;
      if (redirectToFrontPage) pagejs('/');
    },

    /**
     * Fits current edited route on available screen space.
     */
    fitEditedRouteOnView: function() {
      if (!this.pathCoords[0]) return;

      /* Find the bounding area of current route. Area is initialized as single
       * point based on the first node, and then expanded whenever necessary. */
      var routeArea = L.latLngBounds(this._coordsToLatLng(this.pathCoords[0]),
                                     this._coordsToLatLng(this.pathCoords[0]));
      for (var i = 1; i < this.pathCoords.length; i++) {
        routeArea.extend(this._coordsToLatLng(this.pathCoords[i]));
      }

      MapUtilities.positionAreaOnMap(routeArea);
    },

    /**
     * Redraws the route that is being added or edited.
     */
    redrawEditedRoute: function() {
      if (this.polyline) {
        this.map.removeLayer(this.polyline);
      }

      this.polyline = L.geoJson(
        {type: 'LineString', coordinates: this.pathCoords},
        {style: {
          clickable: false,
          color: PolylineOptions.highlightColor,
          smoothFactor: '0.0' }}
      ).addTo(this.map);

      this.redrawSelectedNodeHighlights();
    },

    redrawSelectedNodeHighlights: function() {
      if (this.selectedNodeHighlights.currentPart) {
        this.map.removeLayer(this.selectedNodeHighlights.currentPart);
      }

      if (this.selectedNodeIndex < this.pathCoords.length-1) {
        this.selectedNodeHighlights.currentPart = L.polyline(
          [this._coordsToLatLng(this.pathCoords[this.selectedNodeIndex]),
           this._coordsToLatLng(this.pathCoords[this.selectedNodeIndex + 1])],
          {color: PolylineOptions.selectedSegmentColor, smoothFactor: '0.0'}
          ).addTo(this.map);
      }

      // Immediately redraw ghostlines if possible
      if (this.sightModeOn) {
        this._removeSelectionGhosts();
        this._drawSelectionGhosts(this._getSightLatLng());
      }
    },

    /**
     * Internal helper function to reset the state of adding routes
     */
    _resetEditState: function() {
      this.pathCoords.length = 0;
      this.selectedNodeIndex = null;

      if (this.selectedNodeHighlights.currentPart) {
        this.map.removeLayer(this.selectedNodeHighlights.currentPart);
      }
      this.selectedNodeHighlights.currentPart = null;

      this._removeSelectionGhosts();
      this.selectedNodeHighlights.ghostsVisible = true;

      while (this.markers.length) {
        this.map.removeLayer(this.markers[this.markers.length-1]);
        this.markers.pop();
      }
      this.hoveredMarker = null;

      this.markers.length = 0;

      if (this.polyline) {
        this.map.removeLayer(this.polyline);
        this.polyline = null;
      }

      /* Readd the route that was being edited. This is needed because it was
       * removed from the map when editing it began. */
      if (this.editedRouteId) {
        /* The route will only be added to the map if it is no longer
         * the route being edited. */
        var routeToAdd = this.editedRouteId;
        this.editedRouteId = null;
        routeOverlay.addSiteToMap(routeToAdd);
      }
    },

    /**
     * Fetch route data of currently selected route when it becomes available
     * and initialize route edit data with it.
     */
    _populateRouteEditData: function() {
      var currentSiteId = Session.get('siteDetailsId');
      var currentRoute = Sites.findOne({_id: currentSiteId,
                                        routeData: {$exists: true}});
      if (currentSiteId && currentRoute) {
        this._resetEditState();
        this.editedRouteId = currentSiteId;

        // Remove the route from map, so that it won't be shown twice
        routeOverlay.removeSiteFromMap(currentSiteId);

        this.addPointsToRoute(currentRoute.routeData.coordinates);
      }

      if (!currentSiteId || currentRoute) {
        Deps.currentComputation.stop();
        this.populateRouteDataWatch = null;
      }
    },

    _stopWatches: function() {
      if (this.populateRouteDataWatch) {
        this.populateRouteDataWatch.stop();
        this.populateRouteDataWatch = null;
      }
    },

    _removeSelectionGhosts: function() {
      if (this.selectedNodeHighlights.tailGhost) {
        this.map.removeLayer(this.selectedNodeHighlights.tailGhost);
        this.selectedNodeHighlights.tailGhost = null;
      }

      if (this.selectedNodeHighlights.headGhost) {
        this.map.removeLayer(this.selectedNodeHighlights.headGhost);
        this.selectedNodeHighlights.headGhost = null;
      }
    },

    _drawSelectionGhosts: function(cursorLatLng) {
      if (!this.selectedNodeHighlights.ghostsVisible || this.markerDragOn) return;

      if (typeof this.selectedNodeIndex === 'number' && this.pathCoords[0]) {
        this.selectedNodeHighlights.tailGhost = L.polyline(
          [this._coordsToLatLng(this.pathCoords[this.selectedNodeIndex]),
           cursorLatLng],
          {color: PolylineOptions.editGhostColor, smoothFactor: '0.0',
          clickable:false, dashArray: [10, 10]}).addTo(this.map);
      }

      if (this.selectedNodeIndex < this.pathCoords.length-1) {
        this.selectedNodeHighlights.headGhost = L.polyline(
          [cursorLatLng,
           this._coordsToLatLng(this.pathCoords[this.selectedNodeIndex+1])],
          {color: PolylineOptions.editGhostColor, smoothFactor: '0.0',
          clickable:false, dashArray: [10, 10]}).addTo(this.map);
      }
    },

    _refreshRouteAfterMarkerDrag: function(marker) {
      var target = this.markers.indexOf(marker);
      if (target >= 0) {
        var markerLatLng = marker.getLatLng();
        this.pathCoords[target] = [markerLatLng.lng, markerLatLng.lat];
      }
      this.redrawEditedRoute();
    },

    _setMarkerEventMethods: function(marker) {
      if (!this.sightModeOn) {
        marker.on('mouseover', this._onMarkerHoverStart, this);
        marker.on('mouseout', this._onMarkerHoverEnd, this);
      }
      marker.on('click', this._onMarkerClick, this);
      marker.on('drag', this._onMarkerDrag, this);
      marker.on('dragstart', this._onMarkerDragstart, this);
      marker.on('dragend', this._onMarkerDragend, this);
    },

    /**
     * Internal helper function that is used to update node highlighting
     * when selection changes.
     */
    _setSelectedNodeHighlight: function(highlighted) {
      if (typeof this.selectedNodeIndex !== 'number') return;

      if (highlighted) {
        this.markers[this.selectedNodeIndex].setIcon(
          L.icon(MarkerIconOptions.routeEditSelected));
        this.markers[this.selectedNodeIndex].setZIndexOffset(6000);
      } else {
        this.markers[this.selectedNodeIndex].setIcon(
          L.icon(MarkerIconOptions.routeEdit));
        this.markers[this.selectedNodeIndex].setZIndexOffset(0);
      }
    },

    /**
     * @return The distance (in pixels) between two Leaflet Point points.
     */
    _distanceBetweenPoints: function(point1, point2) {
      var xDelta = point1.x - point2.x;
      var yDelta = point1.y - point2.y;
      return Math.sqrt(xDelta*xDelta+yDelta*yDelta);
    },

    /**
     * Creates and returns a L.LatLng object
     * @param  {Array} lngLat [lng, lat]
     * @return {Object}       L.LatLng object
     */
    _coordsToLatLng: function(lngLat) {
      return L.latLng(lngLat[1], lngLat[0]);
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
        this.addPointsToRoute([[e.latlng.lng, e.latlng.lat]]);
      }
    },

    _onMapMove: function(e) {
      this._removeSelectionGhosts();
      this._drawSelectionGhosts(this.sightModeOn ? this._getSightLatLng() :
                                                   e.latlng);
    },

    _onMarkerHoverStart: function(e) {
      this._hideSelectionGhosts();

      // Slightly highlight the hovered marker.
      if (this.markers.indexOf(e.target) !== this.selectedNodeIndex &&
          !this.markerDragOn) {
        e.target.setIcon(L.icon(MarkerIconOptions.routeEditHover));
        this.hoveredMarker = e.target;
      }
    },

    _onMarkerHoverEnd: function(e) {
      this._showSelectionGhosts();

      // Restore original icon to the hovered marker.
      if (this.markers.indexOf(e.target) !== this.selectedNodeIndex &&
          !this.markerDragOn) {
        this.hoveredMarker = null;
        e.target.setIcon(L.icon(MarkerIconOptions.routeEdit));
      }
    },

    /**
     * Event handler function used to hide selected node ghost lines when the
     * cursor leaves map (for example: detail view or a node marker is hovered).
     */
    _hideSelectionGhosts: function() {
      this.selectedNodeHighlights.ghostsVisible = false;
      this._removeSelectionGhosts();
    },

    /**
     * Event handler function used to allow drawing of selected node ghost lines
     * when cursor re-enters the map.
     */
    _showSelectionGhosts: function() {
      this.selectedNodeHighlights.ghostsVisible = true;
      if (this.sightModeOn)
        this._drawSelectionGhosts(this._getSightLatLng());
    },

    _onMarkerClick: function(e) {
      this._setSelectedNodeHighlight(false);
      this.selectedNodeIndex = this.markers.indexOf(e.target);
      this._setSelectedNodeHighlight(true);

      this.redrawSelectedNodeHighlights();
    },

    /**
     * Internal event handler for editing a route by dragging its markers.
     */
    _onMarkerDrag: function(e) {
      this._refreshRouteAfterMarkerDrag(e.target);
    },

    /**
     * Internal event handler for editing a route by dragging its markers.
     */
    _onMarkerDragstart: function(e) {
      this.markerDragOn = true;
      if (!this.sightModeOn)
        this._hideSelectionGhosts();
    },

    /**
     * Internal event handler for editing a route by dragging its markers.
     */
    _onMarkerDragend: function(e) {
      this.markerDragOn = false;
      var latlng = e.target.getLatLng();
      var markerPoint = this.map.latLngToContainerPoint(latlng);

      // Remove hovered marker icon if hovering ended while dragging
      if (this.hoveredMarker && this.hoveredMarker === e.target &&
          this.markers.indexOf(e.target) !== this.selectedNodeIndex) {
        this.hoveredMarker = null;
        e.target.setIcon(L.icon(MarkerIconOptions.routeEdit));
      }
    }
  });

  return RouteEditor;
})();
