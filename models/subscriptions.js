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

Subscriptions = {
  essentialHandles: [],

  /**
   * @return Returns true if all essential things are ready. "Essential" means
   *         things that should be ready before the user is allowed to
   *         interact with the application.
   */
  essentialsReady: function() {
    var isReady = false;

    isReady = Accounts.loginServicesConfigured();
    isReady = isReady && _.every(this.essentialHandles, function(handle) {
      return handle.ready();
    });

    return isReady;
  }
};

if (Meteor.isClient) {
  Subscriptions.essentialHandles.push(Meteor.subscribe('categories'));
  Subscriptions.essentialHandles.push(Meteor.subscribe('userData'));
  Subscriptions.essentialHandles.push(Meteor.subscribe('currentUserData'));

  /* This is in this file because Meteor loads files in the same directory
   * alphabetically. */
  if (Meteor.isClient) {
    Session.set('modelFilesLoaded', true);
  }
}
