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

var loginAutorun = null;

Template.login.rendered = function() {
  $(this.findAll('input')).placeholder();

  $('#login-form').validate({
    /* Validation is initiated manually from Meteor template when
     * form is submitted */
    onsubmit: false,
    rules: {
      'login-password': {
        required: true
      },
      'login-email': {
        required: true,
        email: true
      }
    },

    messages: {
      'login-password':  {
        required: i18n.t('validation.passwordRequired')
      },
      'login-email': {
        required: i18n.t('validation.emailRequired'),
        email: i18n.t('validation.invalidEmail')
      }
    }
  });

  if (loginAutorun) loginAutorun.stop();

  loginAutorun = Deps.autorun(function() {
    if (!Session.equals('currentPrimaryView', 'login')) {
      Deps.currentComputation.stop();
      return;
    }
    $('.login-view .logging-in').toggleClass('hidden', !Meteor.loggingIn());
  });
};

Template.login.events({
  'submit #login-form' : function(e, t) {
    e.preventDefault();

    $('.login-view .login-failed').addClass('hidden');

    if (!$('#login-form').valid())
      return false;

    var email = t.find('#login-email').value;
    var pw    = t.find('#login-password').value;

    Meteor.loginWithPassword(email, pw, function(error) {
      if (error) {
        console.log('login failed');
        $('#login-form').validate().showErrors({
          'login-password': i18n.t('validation.loginFailed')
        });
      } else {
        Template.login.onLoginSuccess();
      }
    });
  },
  'click .facebook-login-button, tap .facebook-login-button' : function(e, t) {
    $('.login-view .login-failed').addClass('hidden');

    Meteor.loginWithFacebook({requestPermissions: ['email']}, function (error) {
      if (error) {
        $('.login-view .login-failed').removeClass('hidden');
        console.log('Login with Facebook failed: ' + error);
      } else {
        Template.login.onLoginSuccess();
      }
    });
  },
  'click .google-login-button, tap .google-login-button' : function(e, t) {
    $('.login-view .login-failed').addClass('hidden');

    Meteor.loginWithGoogle({requestPermissions: ['email']}, function (error) {
      if (error) {
        $('.login-view .login-failed').removeClass('hidden');
        console.log('Login with Google failed: ' + error);
      } else {
        Template.login.onLoginSuccess();
      }
    });
  },

  'mousedown button': function (event, template) {
    /* Prevent jQuery validation when clicking any button but submit (which
     * is an input element). Without this, writing an invalid email would
     * show error message when clicking register redirect button, and sometimes
     * prevent the redirect. */
    return false;
  }
});

Template.login.onLoginSuccess = function() {
  ViewMessage.show(i18n.t('user.hasLoggedIn'), {timeout: 5000});
  // This will override the previous message if user is banned.
  Utilities.showUserIsBannedMessage();

  pagejs(Session.get('loginSuccessRedirect'));
  Session.set('loginSuccessRedirect', undefined);
};

Template.register.rendered = function() {
  $(this.findAll('input')).placeholder();

  $('#register-form').validate({
    /* Validation is initiated manually from Meteor template when
     * form is submitted */
    onsubmit: false,
    rules: {
      'register-email': ValidationRules.accountEmail,
      'register-name': ValidationRules.accountName,
      'register-password': ValidationRules.accountPassword,
      'register-password-confirm': {
        required: true,
        equalTo: '#register-password'
      }
    },

    messages: {
      'register-email': ValidationMessages.accountEmail,
      'register-name': ValidationMessages.accountName,
      'register-password': ValidationMessages.accountPassword,
      'register-password-confirm': ValidationMessages.passwordConfirm
    }
  });
};

Template.register.events({
  'submit #register-form' : function(e, t) {
    function showGeneralRegisterError() {
      $('#register-general-error').removeClass('hidden');
    }

    e.preventDefault();

    $('#register-general-error').addClass('hidden');

    if (!$('#register-form').valid()) {
      showGeneralRegisterError();
      return false;
    }

    var email = t.find('#register-email').value;
    var name  = t.find('#register-name').value;
    var pw    = t.find('#register-password').value;

    Accounts.createUser({email: email, password: pw, profile: {name: name}},
                        function(error) {
      if (error) {
        console.log('register failed');
        showGeneralRegisterError();
      } else {
        pagejs('/profile/general');
        console.log("register successful");
      }
    });
  }
});
