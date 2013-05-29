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

var MAX_NAME_LENGTH = 128;
var MAX_DESCRIPTION_LENGTH = 8192;

/**
 * Extends a MongoDB selector so that it can be used to search for sites that
 * belong to certain categories.
 * @param {Object} selector    MongoDB selector. This will be modified.
 * @param {Array} categoryList list of category keys
 */
setSiteCategorySelector = function(selector, categoryList) {
  if (!categoryList || categoryList.length === 0) return;

  if (_.contains(categoryList, 'other')) {
    var categorySelectors = [
      {categories: {$in: categoryList}},
      {categories: []}
    ];
    // Merge to previous $or selector
    selector['$or'] = selector['$or'] || [];
    selector['$or'] = _.union(selector['$or'], categorySelectors);
  } else {
    selector['categories'] = {$in: categoryList};
  }
};

Meteor.startup(function() {
  Sites.allow({
    insert: function(userId, site) {
      if (!userId || !site.location || !site.categories)
        return false;

      if (!UserService.isEmailVerified(userId))
        return false;

      var isRoute = !!site.routeData;

      if (isRoute && !site.routeLength)
        return false;

      try {
        check(site.name, String);
        check(site.description, String);

        if (isRoute) {
          check(site.routeLength, Number);
        }
      } catch (e) {
        return false;
      }

      if (site.importId)
        return false;

      if (site.name.length > MAX_NAME_LENGTH)
        return false;

      if (site.description.length > MAX_DESCRIPTION_LENGTH)
        return false;

      if (!ValidationUtils.localitiesArray(site.localities))
        return false;

      if (site.mainLocalityId) {
        check(site.mainLocalityId, String);
      }

      if (!ValidationUtils.categoryList(site.categories))
        return false;

      if (!ValidationUtils.GeoJSONPoint(site.location))
        return false;

      if (isRoute && !ValidationUtils.BoundingBox(site.area))
        return false;

      if (isRoute && !ValidationUtils.routeDataObject(site.routeData))
        return false;

      // Check if some alien properties have been inserted
      if (isRoute) {
        for (var p in site) {
          if (!(p === '_id' || p === 'name' || p === 'location' ||
              p === 'description' || p === 'routeData' || p === 'routeLength' ||
              p === 'area' || p === 'categories' || p === 'localities' ||
              p === 'mainLocalityId' || p === 'points'))
            return false;
        }
      } else {
        for (var p in site) {
          if (!(p === '_id' || p === 'name' || p === 'location' ||
              p === 'description' || p === 'categories' || p === 'localities' ||
              p === 'mainLocalityId' || p === 'points'))
            return false;
        }
      }

      if (site.points !== 0)
        return false;

      var archiveSuccessful = Boolean(ArchiveUtilities.archiveSite({
        siteId: site._id,
        userId: userId,
        oldData: site
      }));
      if (!archiveSuccessful) {
        return false;
      }

      incrementSiteCount(site.mainLocalityId);

      Meteor.users.update(userId, {$inc:
        {points: Meteor.settings.pointsGiven.user.createSite}});

      return true;
    },

    update: function(userId, doc, fields, modifier) {
      if (!userId || !doc)
        return false;

      if (!UserService.isEmailVerified(userId))
        return false;

      for (var mod in modifier) {
        if (!(mod === '$set' || mod === '$pullAll'))
          return false;
      }

      var isRoute = !!doc.routeData;

      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        if (doc.importId && (
            f === 'location' || f === 'area' ||
            f === 'routeLength' || f === 'routeData'))
          return false;

        if (!(f === 'name' || f === 'description'  ||
            f === 'location' || f === 'area' ||
            f === 'categories' || f === 'routeLength' ||
            f === 'routeData' || f === 'pictures' || f === 'localities' ||
            f === 'mainLocalityId'))
          return false;
      }

      var set = modifier['$set']; // Makes the following code simpler
      if (set) {
        if (set.pictures) // Pictures are set only by the server
          return false;

        if (set.name) {
          try {
            check(set.name, String);
          } catch (e) {
            return false;
          }
          if (set.name.length > MAX_NAME_LENGTH)
            return false;
        }

        if (set.description) {
          try {
            check(set.description, String);
          } catch (e) {
            return false;
          }
          if (set.description.length > MAX_DESCRIPTION_LENGTH)
            return false;
        }

        if (set.categories) {
          if (!ValidationUtils.categoryList(set.categories))
            return false;
        }

        if (set.location) {
          if (!ValidationUtils.GeoJSONPoint(set.location))
            return false;
        }

        if (set.localities) {
          if (!ValidationUtils.localitiesArray(set.localities))
            return false;
        }

        if (set.mainLocalityId) {
          check(set.mainLocalityId, String);
        }

        if (isRoute) {
          if (set.routeLength) {
            try {
              check(set.routeLength, Number);
            } catch (e) {
              return false;
            }

            if (set.routeLength <= 0) {
              return false;
            }
          }

          if(set.routeData) {
            if (!ValidationUtils.routeDataObject(set.routeData))
              return false;
          }

          if (set.area) {
            if (!ValidationUtils.BoundingBox(set.area))
              return false;
          }
        }
      }

      var pullAll = modifier['$pullAll'];
      if (pullAll) {
        for (var f in pullAll) {
          if (f !== 'pictures')
            return false;
        }
      }

      var archiveSuccessful = Boolean(ArchiveUtilities.archiveSite({
        siteId: doc._id,
        userId: userId,
        oldData: doc,
        newData: set
      }));
      if (!archiveSuccessful) {
        return false;
      }

      // Only update the site count when updating the field
      if (_.contains(fields, 'mainLocalityId')) {
        updateSiteCount(doc, set || {});
      }

      Sites.update(doc._id, {$inc:
        {points: Meteor.settings.pointsGiven.site.modify}});

      Meteor.users.update(userId, {$inc:
        {points: Meteor.settings.pointsGiven.user.modifySite}});

      return true;
    },

    remove: function(userId) {
      return false;
    }
  });

  Meteor.publish('places', function(geoJson, categories) {
    if (!geoJson) {
      console.error('Error publishing \'places\': Must give a GeoJSON ' +
          'object to restrict the area.');
      return;
    }

    var placeSelector = {
      location: {$geoWithin: {$geometry: geoJson}},
      area: {$exists: false}
    };
    setSiteCategorySelector(placeSelector, categories);

    return Sites.find(
      placeSelector,
      {
        limit: 100,
        fields: {location: true, categories: true},
        sort: {points: -1}
      }
    );
  });

  Meteor.publish('routes', function(geoJson, categories) {
    if (!geoJson) {
      console.error('Error publishing \'routes\': Must give a GeoJSON ' +
          'object to restrict the area.');
      return;
    }

    var routeSelector = {area: {$geoIntersects: {$geometry: geoJson}}};
    setSiteCategorySelector(routeSelector, categories);

    return Sites.find(
      routeSelector,
      {
        limit: 50,
        fields: {routeData: true, location: true, area: true, categories: true},
        sort: {routeLength: -1}
      }
    );
  });

  Meteor.publish('site', function(siteId) {
    if (!siteId) {
      console.error('Error publishing \'site\': Must give a site id.');
      return;
    }
    return Sites.find({_id: siteId});
  });

  Meteor.publish('sites-with-comments-by-user', function(userId) {
    var siteCounts = {};

    var handle = Comments.find({author: userId}).observe({
      added: _.bind(function(comment) {
        if (!siteCounts[comment.site]) {
          var site = Sites.findOne(comment.site, {
            reactive: false,
            fields: {name: 1}
          });
          if (site) {
            this.added('sites', site._id, site);
            siteCounts[comment.site] = 1;
          }
        } else {
          siteCounts[comment.site]++;
        }
      }, this),
      removed: _.bind(function(comment) {
        if (siteCounts[comment.site]) {
          siteCounts[comment.site]--;
          if (siteCounts[comment.site] <= 0) {
            delete siteCounts[comment.site];
            this.removed('sites', comment.site);
          }
        }
      }, this)
    });

    // Observe returns only after the initial added callbacks have been run
    this.ready();

    this.onStop(function() {
      handle.stop();
    });
  });

  Meteor.publish('topSites', function(limit) {
    if (!limit) {
      limit = 20;
    }

    return Sites.find({}, {sort: {points: -1}, limit: limit, fields: {_id: true,
      name: true, points: true}});
  });
});
