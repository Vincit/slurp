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

GpxService = (function() {
  var GpxService = {};

  // Exception class
  GpxService.ImportError = function() {};
  GpxService.ImportError.toString = function() {
    return 'GpxService.ImportError';
  };

  /**
   * Parses a GPX document. Tested with GPX 1.1.
   * @param {String} gpxXml A GPX XML document as a string.
   * @return {Array} List of [lng, lat, alt] coordinate arrays. The coordinates
   * are in the order they were in the given GPX data.
   * @throws {GpxService.ImportError} In case of error.
   */
  GpxService.importGpxAsGeoJsonPoints = function(gpxXml) {
    var points = [];
    try {
      var gpx = $.parseXML(gpxXml);
      // Get the list of all XML elements named 'trkpt'.
      // 'trkpt' is the element representing a track point in GPX 1.1.
      var trackPoints = $(gpx).find('trkpt');

      var previousPoint = null;
      trackPoints.each(function(i, item) {

        var longitude = parseFloat($(item).attr('lon'));
        var latitude = parseFloat($(item).attr('lat'));
        if (_.isNaN(longitude) || _.isNaN(latitude)) {
          return;
        }

        var point = [longitude, latitude];

        // Always add the last point
        if (i === trackPoints.length - 1) {
          points.push(_addElevation(point, item));
          return;
        }

        if (previousPoint) {
          /* Add a middle point only if it is far enough from the point that
           * was last added. */
          if (SiteService.pointDistance(previousPoint, point) > 20.0) {
            points.push(_addElevation(point, item));
            previousPoint = point;
          }
        } else { // Always add the first point
          points.push(_addElevation(point, item));
          previousPoint = point;
        }
      });
    } catch (e) {
      throw new this.ImportError();
    }
    points = SiteService.simplifyRoute(points, true);
    return points;
  };

  function _addElevation(point, item) {
    var eleElement = $(item).find('ele');
    var elevation = parseFloat($(eleElement).text());
    if (elevation) { // This also checks for NaN
      point.push(elevation);
    }

    return point;
  }

  return GpxService;
}());
