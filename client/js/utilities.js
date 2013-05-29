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

Utilities = {
  /**
   * Attempts to fetch data for site with id 'siteId'.
   * Calls 'callback' when data is found and site is of type 'siteType'.
   * Aborts if 'siteId' is invalid or found site is of not type 'siteType'.
   * Runs callback when data for site 'siteId' is found (if site is of 'siteType')
   * @param  {String}   siteId   id of target site
   * @param  {String}   siteType either 'place' or 'route'
   * @param  {Function} callback called when data is found
   */
  loadSiteDataWhenAvailable : function (siteId, siteType, callback) {
    Deps.autorun(function() {
      var currentSite = Sites.findOne({_id: siteId});
      var validSiteType = true;
      if (siteId && currentSite) {
        if (siteType === 'route') {
          validSiteType = currentSite.routeData;
        } else if (siteType === 'place') {
          validSiteType = !currentSite.routeData;
        } else {
          validSiteType = false;
        }
      }
      if (siteId && currentSite && validSiteType) {
        callback(currentSite);
      }

      if (!siteId || currentSite || !validSiteType) {
        Deps.currentComputation.stop();
      }
    });
  },

  isTouchDevice: function() {
    return Modernizr.touch;
  },

  getUserName: function(userId) {
    var user = Meteor.users.findOne(userId);
    /* This works because && and || operators in JS return either 1st or 2nd
     * operand instead of a boolean value. */
    return (user && user.profile && user.profile.name) ||
      new Handlebars.SafeString('<span class="user-removed">' +
      i18n.t('user.removedUserNameReplacement') + '</span>');
  },

  getSiteName: function(siteName) {
    return siteName || new Handlebars.SafeString('<span class="unnamed-site">' +
      i18n.t('site.siteNameReplacement') + '</span>');
  },

  getUserEmailHash: function(userId) {
    var user = Meteor.users.findOne(userId);
    if (user && user.emailHash)
      return user.emailHash;
    return null;
  },

  /**
   * Get an object with the category key and translated name. Very useful with
   * the javascript array map function.
   * @type  {String | Object} obj Either a category key string or category mongo
   *                              document
   * @return {Object}             An object containing at least the key and
   *                              translated name of the category.
   */
  categoryObject: function(obj) {
    if (obj instanceof Object) { // Is a mongo document
      obj.name = i18n.t('category.' + obj.key);
      return obj;
    } else if (typeof obj === 'string') { // Is a key string
      return {
        key: obj,
        name: i18n.t('category.' + obj)
      };
    } else {
      return {};
    }
  },

  /**
   * Creates a spinner on the target element
   * @param  {Object} targetElement A jQuery object in which to place the spinner.
   *                                Can be null if options.dontStart is set to true.
   * @param  {Object} [options]     An object containing optional properties
   * @param  {Number} [options.proportionalSize] Size proportional to the target
   *                                             element size
   * @param  {Number} [options.size] Absolute size, overrides proportionalSize,
   *                                 defaults to 100
   * @param  {Number} [options.minSize] Minimum size for the spinner, overrides
   *                                    proportionalSize and size properties
   * @param  {Number} [options.maxSize] Maximum size for the spinner, overrides
   *                                    all other size properties
   * @param  {String} [options.color] Color for the spinner, defaults to '#666666'
   * @param {Boolean} [options.dontStart] Don't start spinning immediately
   * @return {Object} The spinner object
   */
  createSpinner: function(targetElement, options) {
    if (!options)
      options = {};

    var size = 100;
    var color = options.color || '#666666';

    if (options.proportionalSize && targetElement) {
      var elementWidth = targetElement.width();
      var elementHeight = targetElement.height();
      var limit = elementWidth < elementHeight ? elementWidth : elementHeight;

      size = limit * options.proportionalSize;
    }
    if (options.size) size = options.size;
    if (options.minSize && size < options.minSize) size = options.minSize;
    if (options.maxSize && size > options.maxSize) size = options.maxSize;

    var spinner = new Spinner(
      {
        lines: 7 + Math.round(size / 30) * 2,
        length: Math.round(size / 4),
        radius: Math.round(size / 2),
        width: 2 + Math.round(size / 40),
        color: color,
        hwaccel: true
      });

    return options.dontStart ? spinner : spinner.spin(targetElement[0]);
  },

  initFancybox: function() {
    $('.fancybox').fancybox({
      padding : 0,
      openEffect: 'none',
      prevEffect: 'none',
      nextEffect: 'none',
      type: 'image',
      autoResize: true,
      preload: 3
    });
  },

  /**
   * Manages a file selection widget
   *
   * @param {JQuery} containerJQ A .file-picker-container element which must have
   *                             .file-picker-status and .file-picker-clear
   *                             child elements.
   * @param  {String} [statusPrefixKey] A translation key for the status message
   *                                    prefix. If present, the referenced sentence
   *                                    is inserted before the list of file names.
   *                                    A space is inserted between the prefix and
   *                                    the list.
   */
  updateFilePicker: function(containerJQ, statusPrefixKey) {
    var fileList = containerJQ.children('input.file-picker')[0].files;
    var messageElem = containerJQ.children('.file-picker-status');
    var clearButton = containerJQ.children('.file-picker-clear');

    var message = '';

    if (fileList.length < 1) {
      messageElem.hide();
      clearButton.hide();
    } else {
      if (statusPrefixKey) {
        message = i18n.t(statusPrefixKey, {count: fileList.length}) + ' ';
      }

      for (var i = 0; i < fileList.length; i++) {
        message += fileList[i].name;
        if (i !== fileList.length - 1)
          message += ', ';
      }

      messageElem.show();
      clearButton.show();
    }

    messageElem[0].innerHTML = message;
  },

  /**
   * Clears a file input field. This works by cloning and then replacing the field.
   * @param  {JQuery} containerJQ The .file-picker-container element that should be
   *                              cleared.
   */
  clearFilePicker: function(containerJQ) {
    var input = containerJQ.children('input.file-picker');
    input.replaceWith(input.clone());
  },

  replaceThumbnailOnError: function(imgJQ) {
    imgJQ.error(function(e) {
      $(e.target).attr('src', '/images/thumbnail-missing.png');
    });
  },

  textExcerpt: function(text, maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  },

  showUserIsBannedMessage: function() {
    Meteor.call('getCurrentBanInfoForUser', function(error, result) {
      if (!error && result) {
        ViewMessage.show(i18n.t('user.userIsBannedMessage', {
          endTime: moment(result.end).format('LLL'),
          reason: result.reason}), {type: 'error', timeout: 60000});
      }
    });
  },
  getShortDate: function(date) {
    date = moment(date);

    // Check if the given date is less than a week ago
    if (date.isAfter(moment().subtract({days: 7}))) {
      return date.fromNow();
    } else {
      return date.format('L');
    }
  }
};
