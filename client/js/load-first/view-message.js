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

/*
 * This view message is meant to be used for persistent or timed (will hide
 * after a timeout) messages that are specific to one primary view. That is
 * because currently the message is hidden when the primary view changes and
 * any new message hides the previous one i.e. only one message is shown at
 * any given time.
 */
ViewMessage = (function() {
  "use strict";

  var object = {};

  object.lastMessage = null;
  object.lastOptions = null;
  object.timeoutHandle = null;

  var ELEMENT_SELECTOR = '.view-message-container';

  /**
   * Shows the given message.
   * @param {String} text The text to be displayed.
   * @param {Object} [options] Extra options
   * @param {Number} [options.timeout] Timeout for hiding the message. If not
   *                                   given, the message will stay shown until
   *                                   another message replaces it or the
   *                                   message is hidden.
   * @param {String} [options.type='notification'] Controls the message's visual
   *                                               style. Possible values are:
   *                                               'notification' (default) and
   *                                               'error'.
   */
  object.show = function(text, options) {
    if (!options)
      options = {};
    if (options.type === undefined)
      options.type = 'notification';

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    var elem = $(ELEMENT_SELECTOR);
    if (elem.length > 0) {
      elem.children('p').html(text);
      elem.addClass(options.type);
      elem.show();
      if (options.timeout && options.timeout > 0) {
        this.timeoutHandle = setTimeout(_.bind(this.hide, this), options.timeout);
      }
    }
    this.lastMessage = text;
    this.lastOptions = options;
  };

  /**
   * Hides the message that is currently being shown or is waiting to be shown.
   *
   * @param {Object} [options] The following options are supported:
   *   - soft: If hiding should be soft. If true, only hide the message if it
   *           doesn't have a timeout associated with it. If this option is not
   *           given or is false, the message is always hidden. Optional.
   */
  object.hide = function(options) {
    if (options && options.soft && this.lastOptions &&
     this.lastOptions.timeout > 0) {
      return;
    }

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    var elem = $(ELEMENT_SELECTOR);
    elem.hide();
    elem.children('p').html('');
    if (this.lastOptions)
      elem.removeClass(this.lastOptions.type);

    this.lastMessage = null;
    this.lastOptions = null;
  };

  return object;
}());
