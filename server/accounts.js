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

Meteor.methods({
  isEmailAvailable: function(email) {
    return !Meteor.users.findOne({'emails.address': email});
  },
  isEmailAvailableForCurrentUser: function(email, userId) {
    var userWithSameEmail = Meteor.users.findOne({'emails.address': email});
    return !userWithSameEmail || userWithSameEmail._id === userId;
  },
  removeProfile: function() {
    var user = Meteor.user();

    if (!user)
      return;

    var comments = Comments.find({author: user._id}, {_id: true}).fetch();
    for (var i = 0; i < comments.length; i++) {
      Meteor.call('deleteComment', comments[i]._id);
    }

    Meteor.users.remove({_id: user._id});
  },
  sendVerificationEmailForCurrentUser: function() {
    if (!Meteor.userId()) return;
    Accounts.sendVerificationEmail(Meteor.userId());
  }
});

Accounts.config({
  sendVerificationEmail: true,
  forbidClientAccountCreation: false
});

Accounts.onCreateUser(function (options, user) {
  if (user.emails) {
    // Prevent email verification forgery
    for (var i = 0; i < user.emails.length; ++i) {
      if (user.emails[0].verified) {
        throw Error('Cannot create user: Attempted to forge email verification.');
      }
    }
  } else if (user.services) {
    /* If the user registers through a login service (Facebook, Google etc.),
     * try to get the email address from the data provided by the service. */
    for (var service in user.services) {
      var email = user.services[service].email;
      if (email) {
        // At least the Google service has this property
        var verified = Boolean(user.services[service].verified_email);

        // Trust Facebook to not allow the primary email to be an unverified one
        if (!verified && service === 'facebook') {
          verified = true;
        }

        user.emails = [{
          address: email,
          verified: verified
        }];
        break;
      }
    }
  }

  // Validate email address
  if (!user.emails || user.emails.length <= 0) {
    throw Error('Cannot create user: Email is required.');
  } else if (user.emails.length > 1) {
    // Only one email address is supported
    throw Error('Cannot create user: User must have exactly 1 email ' +
        'address, not ' + user.emails.length + '.');
  }
  if (!ValidationUtils.userEmail(user.emails[0])) {
    throw Error('Cannot create user: Email validation failed.');
  }

  // Generate email hash
  user.emailHash = CryptoJS.MD5(user.emails[0].address).toString();

  // Check for profile
  if (!options.profile) {
    throw Error('Cannot create user: Must have a profile.');
  }
  user.profile = options.profile;
  user.points = 0;

  // Validate name
  if (!user.profile.name) {
    throw Error('Cannot create user: Must give a name.');
  }
  ValidationUtils.userName(user.profile.name);

  // Check that nothing strange is added to the profile
  for (property in user.profile) {
    if (!(property === 'name')) {
      throw Error('Cannot create user: Found an invalid profile property.');
    }
  }

  // Continue user creation normally
  return user;
});

// Settings for Meteor's Accounts package

/* Changed these URLs from the default ones beginning with '#' because they
 * didn't seem to work with the routing used. */
Accounts.urls.resetPassword = function (token) {
  return Meteor.absoluteUrl('reset-password/' + token);
};
Accounts.urls.verifyEmail = function (token) {
  return Meteor.absoluteUrl('verify-email/' + token);
};
Accounts.emailTemplates.siteName = 'Liikunta- ja ulkoilureitit';
Accounts.emailTemplates.from = 'reittidemo-info@vincit.fi';
Accounts.emailTemplates.resetPassword.subject = function (user) {
  return i18n.t('user.passwordResetEmailSubject', {
    siteName: Accounts.emailTemplates.siteName
  });
};
Accounts.emailTemplates.resetPassword.text = function (user, url) {
  return i18n.t('user.passwordResetEmailText', {url: url});
};
Accounts.emailTemplates.verifyEmail.subject = function (user) {
  return i18n.t('user.emailVerificationSubject', {
    siteName: Accounts.emailTemplates.siteName
  });
};
Accounts.emailTemplates.verifyEmail.text = function (user, url) {
  return i18n.t('user.emailVerificationText', {url: url});
};

// Configurations for login services

if (Meteor.settings.loginServices) {
  if (Meteor.settings.loginServices.facebook) {
    Accounts.loginServiceConfiguration.remove({
      service: 'facebook'
    });
    Accounts.loginServiceConfiguration.insert({
      service: 'facebook',
      appId: Meteor.settings.loginServices.facebook.appId,
      secret: Meteor.settings.loginServices.facebook.secret
    });
  } else {
    console.warn('Facebook login service not configured. It will not work.');
  }

  if (Meteor.settings.loginServices.google) {
    Accounts.loginServiceConfiguration.remove({
      service: 'google'
    });
    Accounts.loginServiceConfiguration.insert({
      service: 'google',
      clientId: Meteor.settings.loginServices.google.clientId,
      secret: Meteor.settings.loginServices.google.secret
    });
  } else {
    console.warn('Google login service not configured. It will not work.');
  }
} else {
  console.warn('No external login services configured. They will not work.');
}

/**
 * Checks if a user is allowed to attempt any operations on database.
 * This fails for example if user does not exist or is banned.
 * @param  {string} userId
 * @return {Boolean}       true if allowed, false otherwise.
 */
checkUserForDbOperations = function(userId) {
  try {
    var user = Meteor.users.findOne({_id: userId});
    if (!user) return false;

    if (user.banHistory && _.last(user.banHistory).end > new Date())
      return false;

  } catch (error) {
    return false;
  }

  return true;
};

Meteor.startup(function() {
  var denySettings = {
    insert: function (userId, doc) {
      return !checkUserForDbOperations(userId);
    },
    update: function (userId, doc, fields, modifier) {
      return !checkUserForDbOperations(userId);
    },
    remove: function (userId, doc) {
      return !checkUserForDbOperations(userId);
    },
    fetch: []
  };

  // Add deny only to those collections that users might be allowed to modify.
  Comments.deny(denySettings);
  SiteRatings.deny(denySettings);
  Sites.deny(denySettings);
});
