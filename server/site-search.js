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

(function() {
  "use strict";

  Meteor.methods({
    /**
     * @param {String} searchInput The text to search with
     * @param {Object} options Object that contains search options. Can contain
     *                         following properties:
     *                         - categories: array of category keys
     *                         - location: [lng, lat]. Results that are closer
     *                           to this location are ranked higher.
     * @return {Object} An object containing the following properties:
     *         - results: Search results. List of Site objects.
     */
    search: function(searchInput, options) {
      // Variable that is to be the return value.
      var result = {
        locality: '',
        searchInput: searchInput,
        searchResults: []
      };

      // Split search terms into an array and convert to lower case
      var searchTerms = (searchInput.split(' ')).map(function (term) {
        return term.toLowerCase();
      });

      if (searchTerms.length > 0) {
        var sites = [];
        var hits = [];
        var searchCategories = options && options.categories;
        var queryOptions = {fields: {_id: true, location: true}};
        var uniqFilter = function(item) { return item._id; };

        // Get all hits from the database
        for (var i = 0; i < searchTerms.length; ++i) {
          if (searchTerms[i].length <= 0) {
            continue;
          }

          var locality = Localities.findOne({name: searchTerms[i]});
          var termResults;

          if (searchCategories) {
            var nameSelector = {name: _regExpFromSearchTerm(searchTerms[i])};
            setSiteCategorySelector(nameSelector, searchCategories);

            termResults = Sites.find(nameSelector, queryOptions).fetch();

            if (locality) {
              var localitySelector = {localities: {$in: [locality.name]}};
              setSiteCategorySelector(localitySelector, searchCategories);

              termResults = termResults.concat(
                Sites.find(localitySelector, queryOptions).fetch());
            }

            sites = sites.concat(_.uniq(termResults, false, uniqFilter));
          } else {
            termResults = Sites.find({name: _regExpFromSearchTerm(
              searchTerms[i])}, queryOptions).fetch();

            if (locality) {
              termResults = termResults.concat(Sites.find(
                {localities: {$in: [locality.name]}}, queryOptions).fetch());
            }

            sites = sites.concat(_.uniq(termResults, false, uniqFilter));
          }
        }

        if (sites.length > 0) {
          /* Calculate how many hits each of the sites got so we can show the best
            * matches first. This could be optimized by moving the most frequently
            * hit sites to the start of the array. */
          for (var i = 0; i < sites.length; ++i) {
            var hitFound = false;
            for (var j = 0; j < hits.length; ++j) {
              if (sites[i]._id === hits[j].id) {
                hits[j].hits++;
                hitFound = true;
                break;
              }
            }

            if (hitFound === false) { // Not found in the hit count list, add new
              hits.push({id: sites[i]._id, hits: 1,
                loc: sites[i].location});
            }
          }

          if (options.location) {
            for (var i = 0; i < hits.length; ++i) {
              hits[i].dist = SiteService.pointDistance(
                options.location, hits[i].loc.coordinates);
            }

            hits.sort(function (a, b) {
              return b.hits - a.hits + (b.dist < a.dist ? 0.5 : -0.5);
            });
          } else {
            hits.sort(function (a, b) { return b.hits - a.hits; });
          }

          /* Get the actual data from the collection and add distance and rating
           * data. */
          for (var i = 0; i < hits.length; ++i) {
            var id = hits[i].id;
            var site = Sites.findOne(id, {fields: {name: true, categories: true,
              location: true, area: true}});

            if (hits[i].dist)
              site.distance = hits[i].dist / 1000; // from meters to kilometers

            var positiveCount = SiteRatings.find({siteId: id, positive:
              true}).count();
            var totalCount = positiveCount + SiteRatings.find({siteId: id,
              positive: false}).count();

            if (totalCount > 0) {
              site.rating = positiveCount / totalCount;
            }

            result.searchResults.push(site);
          }
        }
      }

      return result;
    }
  });

  function _regExpFromSearchTerm(term) {
    function _escapeRegExp(string){
      return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }
    var regExpString = _escapeRegExp(term);
    // Force whole word match if the search term is short.
    if (term.length <= 3) {
      regExpString = '\\b' + regExpString + '\\b';
    }
    return new RegExp(regExpString, 'i');
  }
}());
