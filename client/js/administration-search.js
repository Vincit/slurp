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

/**
 * Constructor for the AdministrationSearch object for use in adminTools templates.
 * You can also indirectly search other collections by mapping id properties to
 * the corresponding collection. For example, in a collection where 'site' is an
 * id to the Sites collection; properties: ['site.name'], map: {'site': Sites}
 * will let you search documents with the site's actual name.
 *
 * @param {Object} collection The Meteor.Collection to be searched
 * @param {Array} properties  Array of strings that contains the properties that
 *                            should be searched
 * @param {Object} [map] An object describing property links to other collections.
 *                       If you have a property that just contains an id to a
 *                       document in another collection, you can search values
 *                       of that document.
 * @return {Object}      An AdministrationSearch object
 */
AdministrationSearch = function(collection, properties, map) {
  "use strict";

  // Public members
  this.collection = collection;
  this.propertiesToSearch = properties;
  this.propertyMap = map;
  this.resultLimit = 20;

  /**
   * Performs a generalized search on a collection with the set properties.
   * @param  {String} searchInput A text string with which to search. Unlike site
   *                              search, input is not split up before doing the
   *                              database search. Empty string will get all
   *                              documents.
   * @return {Array} An array of documents from the defined collection
   */
  this.search = function(searchInput) {
    if (searchInput.length > 0) {
      var properties = [];

      // Remove mapped properties from regular search
      if (this.propertyMap) {
        var mapped = [];

        for (var i = 0; i < this.propertiesToSearch.length; ++i) {
          var base = this.propertiesToSearch[i].split('.')[0];

          if (_.has(this.propertyMap, base)) { // Is a mapped property
            mapped.push({
              collection: this.propertyMap[base],
              base: base,
              field: this.propertiesToSearch[i].slice(base.length + 1)
            });
          } else {
            properties.push(this.propertiesToSearch[i]);
          }
        }
      } else {
        properties = this.propertiesToSearch;
      }

      // Escape any metacharacters
      var regexString = searchInput.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

      var queries = [];

      for (var i = 0; i < properties.length; ++i) {
        var query = {};
        query[properties[i]] = {$regex: regexString, $options: 'i'};
        queries.push(query);
      }

      // Perform the regular search
      var result = this.collection.find({$or: queries},
        {limit: this.resultLimit}).fetch();

      // Add results from linked search
      if (mapped) {
        var getId = function(doc) {
          return doc._id;
        };

        for (var i = 0; i < mapped.length && result.length < this.resultLimit;
            ++i) {
          var neededResults = this.resultLimit - result.length;

          // Use this longer syntax to use string variables as field names
          var selector = {};
          selector[mapped[i].field] = {$regex: regexString, $options: 'i'};

          var resultIds = mapped[i].collection.find(selector,
            {limit: neededResults}).map(getId);

          selector = {};
          selector[mapped[i].base] = {$in: resultIds};

          result = result.concat(this.collection.find(selector,
            {limit: neededResults}).fetch());
        }
      }

      return result;

    } else {
      return this.collection.find({}, {limit: this.resultLimit}).fetch();
    }
  };
};