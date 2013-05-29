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

SiteService = (function() {
  "use strict";

  var SiteService = {};

  /**
   * Inserts a new Site (Route or Place) into the database.
   * @param {Object}   site       The site object to add.
   * @param {Function} [callback] function to be called when insert finishes.
   *                              Takes one parameter: id of the inserted site,
   *                              or undefined if operation was unsuccessful.
   */
  SiteService.insert = function(site, callback) {
    _updateGeneratedData(site, function(success) {
      if (!site.localities)
        site.localities = [];

      if (success) {
        site.points = 0;
        Sites.insert(site, function(error, siteId) {
          if (callback)
            callback(siteId);
        });
      } else if (callback) {
        callback();
      }
    });
  };

  /**
   * Simplifies given route while attempting to maintain its shape.
   * @param  {Array} coordinates     list of [lng, lat] coordinates.
   * @param  {Boolean} routeEditable true if users will be able to edit the
   *                                 simplified route in the future, in which
   *                                 case it isn't simplified as much.
   * @return {Array}                 simplified coordinates.
   */
  SiteService.simplifyRoute = function(coordinates, routeEditable) {
    return simplify(coordinates, routeEditable ? 0.00002 : 0.00005, true);
  };

  /**
   * Updates a Site. Note that this function doesn't support using update to
   * replace the document.
   *
   * @param {string}   siteId     Database id of the site to update
   * @param {object}   modifier   Mongo modifier
   * @param {Function} [callback] function to be called when update finishes.
   *                              Takes one parameter: id of the updated site,
   *                              or undefined if operation was unsuccessful.
   */
  SiteService.update = function(siteId, modifier, callback) {
    _updateGeneratedData(modifier['$set'], function(success) {
      if (success) {
        Sites.update({_id: siteId}, modifier, function(error) {
          if (callback)
            callback(!error && siteId);
        });
      } else if (callback) {
        callback(success && siteId);
      }
    });
  };

  /**
   * Calculates and returns the average of given coordinates.
   * @param  {Array} coordinates list of [lng, lat] coordinate pairs.
   * @return {Array}             the average point, [lng, lat]
   */
  SiteService.getAveragePoint = function(coordinates) {
    var sumX = 0.0;
    var sumY = 0.0;

    for (var i = 0; i < coordinates.length; i++) {
      sumX += coordinates[i][0];
      sumY += coordinates[i][1];
    }

    return [sumX / coordinates.length, sumY / coordinates.length];
  };

  /**
   * Calculates and returns the bounding area of given coordinates.
   * @param  {Array} coordinates list of [lng, lat] coordinate pairs.
   * @return {Object}            bounding area, has properties 'ne' and 'sw',
   *                             both of which are [lng, lat] arrays.
   */
  SiteService.getBoundingArea = function(coordinates) {
    if (!coordinates || coordinates.length < 1) return false;

    var area = {
      ne: [coordinates[0][0], coordinates[0][1]],
      sw: [coordinates[0][0], coordinates[0][1]]
    };

    for (var i = 1; i < coordinates.length; ++i) {
      if (area.ne[0] < coordinates[i][0]) area.ne[0] = coordinates[i][0];
      if (area.ne[1] < coordinates[i][1]) area.ne[1] = coordinates[i][1];
      if (area.sw[0] > coordinates[i][0]) area.sw[0] = coordinates[i][0];
      if (area.sw[1] > coordinates[i][1]) area.sw[1] = coordinates[i][1];
    }

    return area;
  };

  /**
   * @param  {Object} area bounding area, has properties 'ne' and 'sw',
   *                       both of which are [lng, lat] arrays.
   * @return {Object}      bounding area in GeoJSON Polygon format
   */
  SiteService.getBoundingGeoJson = function(area) {
    var nw = [area.sw[0], area.ne[1]];
    var ne = area.ne;
    var se = [area.ne[0], area.sw[1]];
    var sw = area.sw;
    return {
      type: 'Polygon',
      coordinates: [[nw, ne, se, sw, nw]]
    };
  };

  /**
   * Returns length of the route in meters.
   * @param  {Array} coordinates an ordered list of [lng, lat] arrays.
   * @return {Number|NaN}
   */
  SiteService.routeLength = function(coordinates) {
    if (coordinates.length === 0) {
      return 0;
    }

    var length = 0;
    var node1 = coordinates[0];
    for (var i = 1; i < coordinates.length; i++) {

      var node2 = coordinates[i];
      if (!node1 || !node2) return NaN;

      length += this.pointDistance(node1, node2);
      node1 = node2;
    }
    return length;
  };

  /**
   * Calculates the distance between two coordinates along the great circle of
   * the Earth using the Haversine formula. Does not take altitude into account.
   * See for example http://en.wikipedia.org/wiki/Haversine_formula
   * @param {Array} first pair of coordinates, [lng, lat] (both numbers)
   * @param {Array} second pair of coordinates, [lng, lat] (both numbers)
   * @return {Number} Distance in meters
   */
  SiteService.pointDistance = function(first, second) {
    var R = 6378137; // Earth radius in meters

    var dLat = (second[1] - first[1]).toRad();
    var dLon = (second[0] - first[0]).toRad();
    var lat1 = first[1].toRad();
    var lat2 = second[1].toRad();
    var sin1 = Math.sin(dLat / 2);
    var sin2 = Math.sin(dLon / 2);

    var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.asin(Math.sqrt(a));
  };

  /**
   * Updates generated data for site before insert or update.
   * @param  {Object}   site     The site object to update.
   * @param  {Function} callback called with boolean parameter that determines
   *                             if the operation was succeeded.
   */
  function _updateGeneratedData(site, callback) {
    if (site.routeData) {
      site.routeLength = SiteService.routeLength(site.routeData.coordinates);
    }
    _updateSiteLocation(site);
    _updateSiteArea(site);

    // Update locality info if location was changed.
    if (site.location) {
      Meteor.call('getAddressInfo', site.location.coordinates[1],
                  site.location.coordinates[0], function(error, result) {
        if (result) {
          site.localities = result.terms;
          site.mainLocalityId = result.mainLocalityId;
        }
        callback(true);
      });
    } else {
      callback(true);
    }
  }

  function _updateSiteLocation(site) {
    if (site.routeData) {
      site.location = {
        type: "Point",
        coordinates: SiteService.getAveragePoint(site.routeData.coordinates)
      };
    }
  }

  function _updateSiteArea(site) {
    if (site.routeData) {
      site.area = SiteService.getBoundingGeoJson(
          SiteService.getBoundingArea(site.routeData.coordinates));
    }
  }

  return SiteService;
})();
