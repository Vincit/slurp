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

Template.topLists.created = function() {
  this._topUsersSubscription = Meteor.subscribe('topUsers', 20);
  this._topSitesSubscription = Meteor.subscribe('topSites', 20);
};

Template.topLists.destroyed = function() {
  this._topUsersSubscription.stop();
  this._topSitesSubscription.stop();
};

Template.topUsers.helpers({
  users: function() {
    return Meteor.users.find({}, {sort: {points: -1}, limit: 20}).map(
      function(doc) {
        doc.name = doc.profile.name;
        if (doc.points !== undefined) {
          doc.rightText = i18n.t('topLists.userPoints', {count: doc.points});
        }

        return doc;
      });
  }
});

Template.topSites.helpers({
  sites: function() {
    return Sites.find({}, {sort: {points: -1}, limit: 20}).map(
      function(doc) {
        doc.link = '/site/' + doc._id + '/general';
        if (doc.points !== undefined) {
          doc.rightText = i18n.t('topLists.sitePoints', {count: doc.points});
        }

        return doc;
      });
  }
});
