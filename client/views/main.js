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

Template.loadIndicator.rendered = function() {
  if (!this.spinner) {
    try {
      this.spinner = Utilities.createSpinner($('#load-indicator'),
        {proportionalSize: 0.15, color: 'white'});
    } catch (e) {
      if (e.message) console.log(e.message);
    }
  }
};

Template.loadIndicator.subscriptionsReady = function() {
  return Subscriptions.essentialsReady();
};

// Listen for Esc button press
Meteor.startup(function() {
  $(document).on('keydown', function(event) {
    if (event.keyCode == 27 &&
        !Session.equals('currentPrimaryView', 'editRoute') &&
        !Session.equals('currentPrimaryView', 'editPlace')) {
      $(document).trigger('escpress');

      pagejs('/');
    }
  });
});
