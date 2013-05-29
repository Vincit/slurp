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
  Meteor.users.allow({
    insert: function(userId, doc) {
      return false;
    },

    update: function(userId, doc, fields, modifier) {
      // Allow a user to only modify his/her information
      if (!userId || !doc || !doc._id || doc._id !== userId) {
        return false;
      }

      for (var mod in modifier) {
        if (mod !== '$set')
          return false;
      }

      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];

        if (!(f === 'profile' || f === 'emails' || f === 'emailHash'))
          return false;
      }

      var setMod = modifier['$set'];
      var EMAILS_FIELD = 'emails';
      var emailsFieldFound = false;

      for (var property in setMod) {
        /* Sorry for you who would like to select fields in a different way,
         * but this is to keep safety checks simple. */
        if (!(property === 'emails.0' || property === 'emailHash' ||
            property === 'profile.name')) {
          console.error('User update denied: Unsupported field selector string: ' +
              property);
          return false;
        }
      }

      try {
        // Strict checks if 'emails' field is updated
        if (setMod['emails.0'] || setMod.emailHash) {
          if (!(setMod['emails.0'] && setMod.emailHash))
            return false;

          var emailHash = CryptoJS.MD5(setMod['emails.0'].address).toString();
          if (setMod.emailHash &&
              emailHash !== setMod.emailHash)
            return false;

          for (var key in modifier['$set']) {
            if (key.substr(0, EMAILS_FIELD.length) === EMAILS_FIELD) {
              if ('verified' in modifier['$set'][key] &&
                modifier['$set'][key].verified)
              {
                /* Allow verified to be set to true if the email address is
                 * the same as the current one and the current one is verified. */
                if (!(doc && doc.emails && doc.emails[0] &&
                    doc.emails[0].address && modifier['$set'][key].address &&
                    modifier['$set'][key].address === doc.emails[0].address &&
                    doc.emails[0].verified)) {
                  console.log('User ' + userId + ' tried to set field \'verified\'' +
                    ' of one of their account\'s emails to true. Denied.');
                  return false;
                }
              }
            }
          }
        }

        if (setMod['profile.name']) {
          ValidationUtils.userName(setMod['profile.name']);
        }

        if (setMod['emails.0'] && setMod['emails.0'].address) {
          ValidationUtils.userEmail(setMod['emails.0'], userId);
        }
      } catch(error) {
        console.error(error.message);
        return false;
      }

      return true;
    },

    remove: function(userId, doc) {
      return false;
    }
  });

  Meteor.publish("userData", function () {
    return Meteor.users.find({},
      {fields: {'_id': true, 'profile.name': true, 'emailHash': true}});
  });

  Meteor.publish('currentUserData', function() {
    return Meteor.users.find(this.userId, {fields: {isAdmin: 1}});
  });

  Meteor.publish('adminUserData', function() {
    if (this.userId) {
      if (Meteor.users.findOne(this.userId).isAdmin) {
        return Meteor.users.find({},
          {fields: {_id: 1, createdAt: 1, emails: 1, profile: 1, banHistory: 1}});
      }
    }
  });

  Meteor.publish('topUsers', function(limit) {
    if (!limit) {
      limit = 20;
    }

    return Meteor.users.find({}, {sort: {points: -1}, limit: limit, fields:
      {_id: true, profile: true, emailHash: true, points: true}});
  });
});

Meteor.methods({
  getCurrentBanInfoForUser: function() {
    var user = Meteor.user();
    if (user && user.banHistory &&
      _.last(user.banHistory).end > new Date()) {
      return _.last(user.banHistory);
    }
  },

  banUser: function(userId, endTime, reason) {
    if (!this.userId ||
        !Meteor.users.findOne({_id: this.userId, isAdmin: true})) {
      return;
    }
    console.log('User ' + this.userId + ' is trying to ban user ' + userId +
                ' until ' + endTime + '. Reason: ' + reason);

    var user = Meteor.users.findOne({_id: userId});
    if (!user) return;

    var callback = function(error) {
      if (error) {
        console.error('Could not ban user: ' + error);
      } else if (user.emails[0].verified) {
        Email.send({
          to: user.emails[0].address,
          from: Accounts.emailTemplates.from,
          subject: i18n.t('admin.banUserEmailSubject', {
            siteName: Accounts.emailTemplates.siteName}),
          text: i18n.t('admin.banUserEmailText', {
            endTime: moment(endTime).format('LLL'), reason: reason})
        });
      }
    };

    var banData = {start: new Date(), end: endTime, reason: reason};
    var modifier = {};

    if (!user.banHistory) {
      modifier['$set'] = {banHistory: [banData]};
    } else {
      modifier['$push'] = {banHistory: banData};
    }

    Meteor.users.update({_id: userId}, modifier, callback);
    return true;
  }
});
