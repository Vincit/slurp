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

var validator = Meteor.require('validator');

ValidationUtils = {
  GeoJSONPoint: function(point) {
    if (!point.type || !point.coordinates)
        return false;

    // Check if some alien properties have been inserted
    for (var p in point) {
      if (!(p === 'coordinates' || p === 'type' ))
        return false;
    }

    // Type check
    try {
      check(point.type, String);
      check(point.coordinates, Array);
    } catch (e) {
      return false;
    }

    if (point.type !== 'Point')
      return false;

    // Check the dimensionality of the point
    if (point.coordinates.length !== 2 &&
        point.coordinates.length !== 3) {
      return false;
    }

    // Type check all the coordinates
    try {
      for (var i = 0; i < point.coordinates.length; i++)
        check(point.coordinates[i], Number);
    } catch (e) {
      return false;
    }

    // Check coordinate sanity
    if (point.coordinates[0] < -180 ||
        point.coordinates[0] > 180)
      return false;

    if (point.coordinates[1] < -90 ||
        point.coordinates[1] > 90)
      return false;

    // Altitude is left unchecked

    return true;
  },

  routeDataObject: function(routeData) {
    try {
      check(routeData, Object);

      if (!routeData.type || !routeData.coordinates) return false;

      for (var p in routeData) {
        if (!(p === 'type' || p === 'coordinates' ))
          return false;
      }

      check(routeData.type, String);
      check(routeData.coordinates, Array);

      // Currently only LineString objects are supported
      if (routeData.type !== 'LineString') return false;

      for (var i = 0; i < routeData.coordinates.length; ++i) {
        check(routeData.coordinates[i], Array);
        // Each coordinate is [lng, lat, alt], where alt is optional.
        if (routeData.coordinates[i].length < 2 ||
            routeData.coordinates[i].length > 3)
          return false;

        for (var j = 0; j < routeData.coordinates[i].length; ++j) {
          check(routeData.coordinates[i][j], Number);
        }
      }
    } catch (e) {
      return false;
    }
    return true;
  },

  BoundingBox: function(area) {
    try {
      // Must have properties 'type' and 'coordinates'
      if (!area.coordinates || !area.type)
        return false;

      // Check if some alien properties have been inserted
      for (var p in area) {
        if (!(p === 'coordinates' || p === 'type' ))
          return false;
      }

      // Check type
      check(area.type, String);
      if (area.type !== 'Polygon')
        return false;

      // The rest is checks for coordinates

      check(area.coordinates, Array);

      if (area.coordinates.length !== 1)
        return false;

      if (area.coordinates[0].length !== 5 ||
          !_.isEqual(area.coordinates[0][0], area.coordinates[0][4])) {
        return false;
      }

      for (var i = 0; i < area.coordinates[0].length; ++i) {
        var coords = area.coordinates[0][i];
        check(coords, Array);
        if (coords.length !== 2) {
          return false;
        }
        for (var j = 0; j < coords; ++j) {
          check(coords[j], Number);
        }
      }
    } catch (e) {
      return false;
    }

    return true;
  },

  categoryList: function(categories) {
    try {
      check(categories, Array);

      for (var i = 0; i < categories.length; i++) {
        check(categories[i], String);
      }
    } catch (e) {
      return false;
    }
    return true;
  },

  localitiesArray: function(localities) {
    try {
      check(localities, Array);

      for (var i = 0; i < localities.length; i++) {
        check(localities[i], String);
        if (!Localities.findOne({name: localities[i]})) return false;
      }
    } catch (e) {
      return false;
    }
    return true;
  },
  /**
   * Validates user's name. This may throw an error in case validation fails.
   * @param {String} name User name
   */
  userName: function(name) {
    validator.check(name).
      notEmpty().
      len(1, ValidationRules.accountName.maxlength).
      regex(ValidationRules.accountName.checkRegex).
      notRegex(/^\s+|\s$/); // No space at start or end
  },
  /**
   * Validates user's email. This may throw an error in case validation fails.
   * @param {Object} email Entry in the 'emails' list of a Meteor user object
   * @param {String} [userId] Id of the user the email address belongs to
   * @return True if validation succeeded. False otherwise.
   */
  userEmail: function(email, userId) {
    if (!email || !email.address) {
      return false;
    }

    validator.check(email.address).isEmail();

    if (userId) {
      if (!Meteor.call('isEmailAvailableForCurrentUser',
          email.address, userId)) {
        return false;
      }
    } else {
      if (!Meteor.call('isEmailAvailable', email.address)) {
        return false;
      }
    }

    return true;
  }
};
