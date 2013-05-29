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
  SiteRatings.allow({
    insert: function(userId, document) {
      var allowed = userId && SiteRatings.findOne({userId: userId, siteId:
        document.siteId}) === undefined && document.userId === userId;

      if (allowed) {
        Sites.update(document.siteId, {$inc: {points:
          Meteor.settings.pointsGiven.site.rate * (document.positive ? 1 : -1)}});

        Meteor.users.update(document.userId, {$inc: {points:
          Meteor.settings.pointsGiven.user.rate}});
      }

      return allowed;
    },
    update: function(userId, document, fields, modifier) {
      var allowed = userId && userId === document.userId;

      if (allowed) {
        if (document.positive === true && modifier.$set.positive === false) {
          Sites.update(document.siteId, {$inc: {points:
            Meteor.settings.pointsGiven.site.rate * -2}});
        } else if (document.positive === false && modifier.$set.positive === true) {
          Sites.update(document.siteId, {$inc: {points:
            Meteor.settings.pointsGiven.site.rate * 2}});
        }
      }

      return allowed;
    },
    remove: function(userId, document) {
      var allowed = userId && userId === document.userId;

      if (allowed) {
        Sites.update(document.siteId, {$inc: {points:
            Meteor.settings.pointsGiven.site.rate * (document.positive ? -1 : 1)}});

        Meteor.users.update(document.userId, {$inc: {points:
          -Meteor.settings.pointsGiven.user.rate}});
      }

      return allowed;
    }
  });

  Meteor.publish('site-ratings', function(siteId) {
    if (!siteId) {
      console.error('Error publishing \'site-ratings\': Must give a site id.');
      return;
    }
    return SiteRatings.find({siteId: siteId});
  });
});
