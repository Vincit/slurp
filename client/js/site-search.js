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

SiteSearch = (function () {
  "use strict";

  var searchInstance;

  var SiteSearch = Class.extend({

    searchDependency: new Deps.Dependency(),
    searchResults: [],

    idle: true,
    instantSearchDelay: 600, // In milliseconds
    searchTimeout: null,
    inputElement: null,

    init: function (inputElement) {
      searchInstance = this;

      inputElement.data('old-value', inputElement.val());

      // Detect any changes to the content of the input field
      inputElement.on('propertychange keyup input paste', function (event) {
        if (inputElement.data('old-value') != inputElement.val()) {
          inputElement.data('old-value', inputElement.val());
          inputElement.trigger('contentchange', event);
        }
      });

      // Attach a custom event triggered by the change detector
      inputElement.on('contentchange', searchInstance.delayHandler);
      inputElement.on('keyup', searchInstance.fullSearchHandler);

      searchInstance.inputElement = inputElement;
    },

    delayHandler: function (event) {
      clearTimeout(searchInstance.searchTimeout);

      if (searchInstance.idle) { // Run just the first time
        searchInstance.idle = false;
        searchInstance.searchResults.length = 0;
        searchInstance.searchDependency.changed();
      }

      searchInstance.searchTimeout = setTimeout(function () {
          searchInstance.search(event.target.value);
        }, searchInstance.instantSearchDelay);
    },

    fullSearchHandler: function (event) {
      if (event.keyCode === 13) {
        searchInstance.searchResults.length = 0;
        clearTimeout(searchInstance.searchTimeout);

        searchInstance.search(event.target.value);
      }
    },

    search: function (searchInput) {

      var options = {};

      if (CategoryList.selectedCategories.length > 0) {
        options.categories = CategoryList.selectedCategories;
      }

      if (LocateWatch.userLocation) {
        options.location = [LocateWatch.userLocation.lng,
                            LocateWatch.userLocation.lat];
      }

      Meteor.call('search', searchInput, options, function (error, result) {
        if (error) {
          console.log('Searching for sites failed: ' + error);
          return;
        }

        searchInstance.idle = true;
        searchInstance.searchResults = result.searchResults;

        searchInstance.searchDependency.changed();
      });
    }
  });

  return SiteSearch;
})();
