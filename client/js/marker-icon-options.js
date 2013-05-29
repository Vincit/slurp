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

MarkerIconOptions = (function() {
  "use strict";

  var MarkerIconOptions = {
    defaultMarker: {
      iconUrl: '/images/markers/marker-default.png',
      iconSize: [24, 32],
      iconAnchor: [12, 32],
    },
    userLocation: {
      iconUrl: '/images/markers/marker-user-location.png',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    },
    highlightedMarker: {
      iconUrl: '/images/markers/marker-highlighted.png',
      iconSize: [24, 32],
      iconAnchor: [12, 32],
    },
    previewMarker: {
      iconUrl: '/images/markers/marker-preview.png',
      iconSize: [24, 32],
      iconAnchor: [12, 32],
    },
    routeMarker: {
      iconUrl: '/images/markers/marker-route.png',
      iconSize: [24, 32],
      iconAnchor: [12, 32],
    },
    routeEdit: {
      iconUrl: '/images/markers/marker-route-point.png',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    },
    routeEditHover: {
      iconUrl: '/images/markers/marker-route-point-hover.png',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    },
    routeEditSelected: {
      iconUrl: '/images/markers/marker-route-point-selected.png',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }
  };

  return MarkerIconOptions;
 })();