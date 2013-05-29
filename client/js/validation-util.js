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

ValidationMessages = {
  accountEmail: {
    required: i18n.t('validation.emailRequired'),
    email: i18n.t('validation.invalidEmail'),
    emailAvailable: i18n.t('validation.emailInUse')
  },
  accountName: {
    required: i18n.t('validation.userNameRequired'),
    maxlength: jQuery.format(i18n.t('validation.longUserName')),
    noSpaceAtStartOrEnd: i18n.t('validation.userNameNoSpaceAtStartOrEnd'),
    checkRegex: i18n.t('validation.userNameInvalidChars')
  },
  accountPassword: {
    minlength: jQuery.format(i18n.t('validation.shortPassword')),
    required: i18n.t('validation.passwordRequired'),
    checkRegex: i18n.t('validation.passwordInvalidChars')
  },
  passwordConfirm: {
    equalTo: i18n.t('validation.passwordsDontMatch'),
    required: i18n.t('validation.passwordRequired')
  }
};

// Some utility methods for jQuery Validation
Meteor.startup(function () {
  $.validator.addMethod('checkRegex', function(value, element, params) {
    return (new RegExp(params).test(value));
  }, '');

  $.validator.addMethod('noSpaceAtStartOrEnd', function(value, element, params) {
    return !(new RegExp(/^\s+|\s$/).test(value));
  }, '');

  $.validator.addMethod('emailAvailable', function(value, element, params) {
    // Performs the check on server, because emails aren't published to client.
    Meteor.call('isEmailAvailable', value, function(error, isAvailable) {
      Session.set('emailAvailable', isAvailable);
      if (!isAvailable) {
        $('#register-form').validate().showErrors({
         'register-email': i18n.t('validation.emailInUse')
        });
      }
    });

    var emailAvailable = Session.get('emailAvailable');
    // Pass form as valid until we get first answer from server query.
    if (emailAvailable === undefined) return true;
    return emailAvailable;
  }, '');

  $.validator.addMethod('emailAvailableForCurrentUser', function(value, element, params) {
    // Performs the check on server, because emails aren't published to client.
    Meteor.call('isEmailAvailableForCurrentUser', value, Meteor.userId(), function(error, isAvailable) {
      Session.set('emailAvailableForCurrentUser', isAvailable);
      if (!isAvailable) {
        $('#edit-profile-form').validate().showErrors({
         'email': i18n.t('validation.emailInUse')
        });
      }
    });

    var emailAvailable = Session.get('emailAvailableForCurrentUser');
    // Pass form as valid until we get first answer from server query.
    if (emailAvailable === undefined) return true;
    return emailAvailable;
  }, '');
});
