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

Template.forgotPassword.rendered = function() {
  $(this.findAll('input')).placeholder();

  var validationOptions = {
    /* Validation is initiated manually from Meteor template when
     * form is submitted */
    onsubmit: false,
    rules: {
      'email': ValidationRules.accountEmail
    },
    messages: {
      'email': ValidationMessages.accountEmail
    }
  };
  // Disable check for email availability.
  validationOptions.rules['email'].emailAvailable = false;
  var form = $('#forgot-password-form');
  form.validate(validationOptions);
  form.find('input[name="email"]').focus();
};

Template.forgotPassword.events({
  'submit #forgot-password-form' : function(e, t) {
    e.preventDefault();

    var form = $('#forgot-password-form');
    form.find('.general-error').addClass('hidden');
    form.find('.success-message').addClass('hidden');

    if (!form.valid()) {
      return false;
    }

    var email = $.trim(form.find('input[name="email"]').val());
    Accounts.forgotPassword({email: email}, function (error) {
      if (error) {
        console.log('Sending forgot password email failed: ' + error);
        form.find('.general-error').removeClass('hidden');
      } else { // success
        form.find('.success-message').removeClass('hidden');
        form.find('div.fields').addClass('hidden');
      }
    });
  }
});

Template.resetPassword.rendered = function() {
  var form = $('#reset-password-form');
  form.validate({
    /* Validation is initiated manually from Meteor template when
     * form is submitted */
    onsubmit: false,
    rules: {
      'password': ValidationRules.accountPassword
    },
    messages: {
      'password': ValidationMessages.accountPassword
    }
  });
  form.find('input[name="password"]').focus();
};

Template.resetPassword.events({
  'submit #reset-password-form' : function(e, t) {
    e.preventDefault();

    var form = $('#reset-password-form');
    form.find('.general-error').addClass('hidden');
    form.find('.success-message').addClass('hidden');

    if (!form.valid()) {
      return false;
    }

    var password = form.find('input[name="password"]').val();
    var token = Session.get('resetPasswordToken');
    Accounts.resetPassword(token, password, function(error) {
      if (error) {
        form.find('.general-error').removeClass('hidden');
      } else { // success
        form.find('.success-message').removeClass('hidden');
        form.find('div.fields').addClass('hidden');
      }
    });
  }
});
