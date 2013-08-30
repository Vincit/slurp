/******************************************************************************
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

(function(global) {
  var UserService = (function() {

    return {
      isEmailVerified: function(userId) {
        if (!userId) return false;
        check(userId, String);

        var user = Meteor.users.findOne(userId);
        if (user && user.emails && user.emails[0] && user.emails[0].verified) {
          return true;
        } else {
          return false;
        }
      }
    };
  })();

  global.UserService = UserService;

})(this);
