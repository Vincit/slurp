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

// Common validation rules and messages for jQuery Validation and Npm validator
ValidationRules = {
  /* Rule for the primary email address of the account.
   * Meant to be used in register and profile edit forms. */
  accountEmail: {
    required: true,
    email: true,
    emailAvailable: true
  },
  /* Rule for the name of the user. Meant to be used in register and
   * profile edit forms. */
  accountName: {
    required: true,
    noSpaceAtStartOrEnd: true,
    maxlength: 40,
    checkRegex: "^[a-zöäåA-ZÖÄÅ0-9_-]*( [a-zöäåA-ZÖÄÅ0-9_-]+)*$"
  },
  accountPassword: {
    required: true,
    minlength: 5,
    checkRegex: "^[a-zöäåA-ZÖÄÅ0-9!§½\"@#£¤$%&/{(\\[\\])}=?+\\\\'*,._;:<|>-]*$"
  }
};
