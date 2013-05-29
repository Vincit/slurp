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

Template.profileInfo.events({
  'click #resend-email-verification, tap #resend-email-verification' : function(event, template) {
    Meteor.call('sendVerificationEmailForCurrentUser');
  }
});

Template.editProfile.events({
  'submit #edit-profile-form' : function(e, t) {
    e.preventDefault();

    var form = $('#edit-profile-form');
    if (!form.valid()) {
      return false;
    }

    var user = Meteor.user();
    if (!user) {
      console.log('Couldn\'t edit user info because no user was found.');
      return false;
    }

    var name = form.find('input[name="name"]').val();
    var email = form.find('input[name="email"]').val();

    var isEmailTheSameAsCurrent = user && user.emails && user.emails[0] &&
        user.emails[0].address && user.emails[0].address === email;
    var verified = isEmailTheSameAsCurrent && user.emails[0].verified;

    Meteor.users.update({_id: user._id}, {$set: {
      'profile.name': name,
      'emails.0': {address: email, verified: verified},
      emailHash: CryptoJS.MD5(email).toString()}
    }, function(error) {
      if (error) {
        console.log('Updating user info failed.');
      } else {
        console.log('Updating user info succeeded.');
        if (!isEmailTheSameAsCurrent) {
          Meteor.call('sendVerificationEmailForCurrentUser');
          ViewMessage.show(i18n.t('user.emailVerificationSent'), {timeout: 5000});
        }
        pagejs('/profile/general');
      }
    });
  }
});

Template.changePassword.events({
  'submit #change-password-form' : function(e, t) {
    e.preventDefault();
    var form = $('#change-password-form');

    function showGeneralError() {
      form.find('.general-error').removeClass('hidden');
    }

    form.find('.general-error').addClass('hidden');
    if (!form.valid()) {
      showGeneralError();
      return false;
    }

    var currentPassword = form.find('input[name="current-password"]').val();
    var password = form.find('input[name="password"]').val();

    Accounts.changePassword(currentPassword, password, function(error) {
      if (error) {
        console.log('Changing password failed: ' + error);
        showGeneralError();
        if (error.error === 403) {
          form.validate().showErrors({
            'current-password': i18n.t('validation.wrongPassword')
          });
        }
        return false;
      } else {
        console.log('Changing password succeeded.');
        pagejs('/profile/general');
      }
    });
  }
});

Template.removeProfile.events({
  'click .submit': function(e, t) {
    if (t.removingProfile)
      return;

    if ($('#remove-profile-challenge').val() !== Meteor.user().emails[0].address) {
      $('.error').toggleClass('hidden', false);
      return;
    }

    t.removingProfile = true;

    Meteor.call('removeProfile', function(err, res) {
      if (err) {
        ViewMessage.show(i18n.t('user.removeFailed'),
         {timeout: 10000, type: 'error'});
      } else {
        ViewMessage.show(i18n.t('user.removeSuccess'),
         {timeout: 5000});
        Meteor.logout();
        pagejs('/');
      }
      t.removingProfile = false;
    });
  }
});

Template.editProfile.rendered = function() {
  $(this.findAll('input')).placeholder();

  // Only set validation rules if the form is present
  if ($('#edit-profile-form').length) {
    var user = Meteor.user();
    var form = $('#edit-profile-form');
    form.find('input[name="name"]').val(user.profile.name);
    form.find('input[name="email"]').val(user.emails[0].address);
    var editProfileValidationOptions = {
      /* Validation is initiated manually from Meteor template when
       * form is submitted */
      onsubmit: false,
      rules: {
        'email': ValidationRules.accountEmail,
        'name': ValidationRules.accountName
      },

      messages: {
        'email': ValidationMessages.accountEmail,
        'name': ValidationMessages.accountName
      }
    };
    editProfileValidationOptions.rules['email'].emailAvailable = false;
    editProfileValidationOptions.rules['email'].emailAvailableForCurrentUser = true;
    $('#edit-profile-form').validate(editProfileValidationOptions);
  }
};

Template.changePassword.rendered = function() {
  $(this.findAll('input')).placeholder();

  if (Session.get('changePassword')) {
    $('#change-password-form').validate({
      /* Validation is initiated manually from Meteor template when
       * form is submitted */
      onsubmit: false,
      rules: {
        'current-password': {
          required: true
        },
        'password': ValidationRules.accountPassword,
        'password-confirm': {
          required: true,
          equalTo: '#change-password-form input[name="password"]'
        }
      },

      messages: {
        'current-password': {
          required: i18n.t('validation.currentPasswordRequired')
        },
        'password': ValidationMessages.accountPassword,
        'password-confirm': ValidationMessages.passwordConfirm
      }
    });
  }
};

Template.profileComments.created = function() {
  this.commentsSubscription = Meteor.subscribe('userComments', Meteor.userId());
  this.sitesSubscription = Meteor.subscribe('sites-with-comments-by-user',
                                            Meteor.userId());
};

Template.profileComments.destroyed = function() {
  this.commentsSubscription.stop();
  this.sitesSubscription.stop();
};

Template.profileComments.rendered = function() {
  Utilities.initFancybox();
  Utilities.replaceThumbnailOnError($('.picture-tile img'));
};

Template.profileComments.helpers({
  commentHeader: function() {
    if (this.siteRemoved) {
      return i18n.t('comments.siteRemoved', {siteName: this.siteName});
    } else {
      return i18n.t('comments.commentInSite', {
        url:'/site/' + this.site + '/comments',
        // getSiteName might return a Handlebars.Safestring
        siteName: Utilities.getSiteName(this.siteName).toString()
      });
    }
  },
  comments: function() {
    var comments = Comments.find(
      {author: Meteor.userId()}, {sort: {dateTime: -1}}).fetch();

    for (var i = 0; i < comments.length; ++i) {
      var site = Sites.findOne({_id: comments[i].site});

      if (site) {
        comments[i].siteName = site.name;
      } else {
        // Don't show 'undefined' even while the data is still loading
        if (!comments[i].siteName) {
          comments[i].siteName = '';
        }
        comments[i].siteRemoved = true;
      }
    }

    return comments;
  }
});
