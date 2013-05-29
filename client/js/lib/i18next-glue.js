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

// File that makes it possible to use i18next in the client-side

// Initialize i18next
i18n.init({ lng: Session.get("lang") || "fi", getAsync: false, resGetPath: "/locales/__lng__/__ns__.json", fallbackLng: "fi" });

// Make it possible to translate strings in Handlebars templates
// Usage: {{t key options_key=option_value option_key2=option_value2 ...}}
// Usage examples:
// {{t "map.locate"}}
// {{t "comments.loginToCommentPrompt" url="/login"}}
Handlebars.registerHelper('t', function(i18n_key, options) {
  var params = {};
  if (options) {
    params = options.hash;
  }
  var result = i18n.t(i18n_key, params);
  return new Handlebars.SafeString(result);
});
