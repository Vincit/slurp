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

Meteor.startup(function() {
  Localities.allow({
    insert: function(userId, locality) {
      return false;
    },
    update: function(userId, doc, fields, modifier) {
      return false;
    },
    remove: function(userId) {
      return false;
    }
  });

  Meteor.publish('localities', function() {
    return Localities.find();
  });

  Meteor.publish('localitiesWithSites', function() {
    return Localities.find({
      location: {$exists: true},
      siteCount: {$not: {$size: 0}}
    });
  });
});
