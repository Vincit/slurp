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

Handlebars.registerHelper('sessionValueTrue', function(key) {
  return Session.equals(key, true);
});

Handlebars.registerHelper('sessionValueEquals', function(key, value) {
  return Session.equals(key, value);
});

Handlebars.registerHelper('sessionValue', function(key) {
  return Session.get(key);
});

Handlebars.registerHelper('getUserName', function(userId) {
  return Utilities.getUserName(userId);
});

Handlebars.registerHelper('getSiteName', function(siteName) {
  return Utilities.getSiteName(siteName);
});

Handlebars.registerHelper('getUserEmailHash', function(userId) {
  return Utilities.getUserEmailHash(userId);
});

Handlebars.registerHelper('capitalize', function(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
});

Handlebars.registerHelper('activeSite', function() {
  return Session.get('siteDetailsId');
});

Handlebars.registerHelper('isTouchDevice', function() {
  return Utilities.isTouchDevice();
});

/* Handlebars helper that changes plain text newlines into HTML ones.
 * Double line breaks split the text into paragraphs. The text is escaped if
 * it is not a Handlebars SafeString. */
Handlebars.registerHelper('newlinesToHtml', function(text) {
  if (text === undefined) {
    return '';
  }

  function escapeHtml(text) {
    text = text.toString();
    return text.replace(/[&<>"'`]/g, escapeChar);

    function escapeChar(char) {
      var escapeMapping = {
        '&':  '&amp;',
        '<':  '&lt;',
        '>':  '&gt;',
        '"':  '&quot;',
        '\'': '&#x27;',
        '`':  ' &#x60;'
      };
      return escapeMapping[char] || '&amp;';
    }
  }

  if (text instanceof Handlebars.SafeString) {
    text = text.toString();
  } else {
    text = escapeHtml(text);
  }
  text = '<p>' + text + '</p>';
  text = text.replace(/(\r\n\r\n|\n\n|\r\r)/gm, '</p><p>');
  text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
  return new Handlebars.SafeString(text);
});

Handlebars.registerHelper('shortDate', function(date) {
  return Utilities.getShortDate(date);
});

Handlebars.registerHelper('longDate', function(date) {
  return moment(date).format('LLL');
});

Handlebars.registerHelper('browserSupportsFileList', function() {
  return Boolean(window.FileList);
});

Handlebars.registerHelper('emailVerified', function() {
  return UserService.isEmailVerified(Meteor.userId());
});
