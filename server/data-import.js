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
     * Allow admin users to update remote sites when necessary.
     */
    startRemoteSitesUpdate: function() {
      if (this.userId &&
          Meteor.users.findOne({_id: this.userId, isAdmin: true})) {
        console.log('User ' + this.userId + ' initiated remote site update.');
        updateRemoteSites(false);
      }
    }
  });
}());


/**
 * Tries to add sites from remote sources which are defined in
 * data-import-settings.json file.
 * @param  {Boolean} firstLoad if true, attempts to add sites from all sources
 *                             (should only be used if database is empty).
 *                             If false, only adds sites from those sources
 *                             which have unique ids for sites: this is to make
 *                             sure no updated sites are added twice.
 */
updateRemoteSites = function(firstLoad) {
  // If loading has been started already but hasn't finished.
  if (sourcesLoading > 0) return;

  var importSettings;
  try {
    var fs = Npm.require('fs');
    importSettings = JSON.parse(
      fs.readFileSync('./server/data-import-settings.json', 'ascii'));
  } catch (error) {
    console.log('Could not read data import settings.');
    console.error(error);
    return;
  }

  var request = Npm.require('request');
  console.log('Starting to update remote sites.');
  console.time('Loading timer');
  sourcesLoading = 0;
  sitesAdded = 0;

  for (var source in importSettings.sources) {
    if (importSettings.sources[source].enabled && (
        !Meteor.settings.developmentSettings ||
        importSettings.sources[source].loadOnDev)) {
      ++sourcesLoading;
      var requestCallback = function() {
        var sourceSettings = importSettings.sources[source];
        return function(err, response, body) {
          if (!err && body) {
            try {
              if (firstLoad || sourceSettings.hasUniqueIds) {
                createNewRemoteSites(JSON.parse(body), sourceSettings);
              } else {
                --sourcesLoading;
              }
            } catch (e) {
              console.log('Failed to load remote site data: ' + e);
              --sourcesLoading;
            }
          }
        };
      }();
      request(importSettings.sources[source].url, requestCallback);
    }
  }
};

var sourcesLoading = 0;
var sitesAdded = 0;

/**
 * Attempts to create new sites found from remote data source.
 * @param  {Object} data           parsed data that was fetched from source.
 * @param  {Object} sourceSettings all settings defined for this source.
 */
function createNewRemoteSites(data, sourceSettings) {
  // Operations on collections need to be ran inside a fiber.
  var Fiber = Npm.require('fibers');
  Fiber(function() {
    switch (sourceSettings.format) {
      case 'lipas':
        createNewRemoteSitesLipasFormat(data, sourceSettings);
        break;
      case 'tampere':
        createNewRemoteSitesTampereFormat(data, sourceSettings);
        break;
      case 'fillaristit':
        createNewRemoteSitesFillaristitFormat(data, sourceSettings);
        break;
      default:
        console.log('Invalid format \'' + sourceSettings.format + '\'.');
        break;
    }
    --sourcesLoading;
    if (sourcesLoading <= 0) {
      console.log('');
      console.log('All remote site sources loaded!');
      console.log('Added ' + sitesAdded + ' sites.');
      console.timeEnd('Loading timer');

      addMissingLocalities();
    }
  }).run();
}

/**
 * @see createNewRemoteSites
 */
function createNewRemoteSitesLipasFormat(data, sourceSettings) {
  if (data.type !== 'FeatureCollection' || !data.features) {
    console.log('Invalid GeoJSON object type. ' +
                'Only FeatureCollections are supported.');
    return;
  }
  console.log('Starting to add ' + data.features.length + ' sites!');

  for (var i = 0; i < data.features.length; ++i) {
    var geom = data.features[i] && data.features[i].geometry;
    if (!geom) continue;

    // Don't process the site if its type code isn't in the whitelist
    if (!data.features[i].properties['tyyppikoodi'] ||
        (sourceSettings && sourceSettings.typeCodeWhitelist &&
        !_.contains(sourceSettings.typeCodeWhitelist,
        data.features[i].properties['tyyppikoodi']))) {
      continue;
    }

    var isRoute = false;
    var importId;
    if (data.features[i].properties['reitti_id'] && (
        data.features[i].geometry.type === 'LineString' ||
        data.features[i].geometry.type === 'MultiLineString')) {
      isRoute = true;
      importId = sourceSettings.idPrefix + '-' + 'route' + '-' +
                 data.features[i].properties['reitti_id'];

    } else if (data.features[i].properties['sijainti_id'] &&
               data.features[i].geometry.type === 'Point') {
      importId = sourceSettings.idPrefix + '-' + 'place' + '-' +
                 data.features[i].properties['sijainti_id'];
    } else {
      continue;
    }

    if (Sites.findOne({importId: importId})) {
      continue;
    }

    if (isRoute) {
      combineRoutesToOne(data.features[i], data.features, i+1);
    } else {
      combinePlacesToOne(data.features[i], data.features, i+1);
    }

    var siteData = {
      importId: importId,
      name: data.features[i].properties['nimi_fi'],
      type: geom.type
    };

    if (sourceSettings.categories) {
      siteData.categories = [];
      for (var j = 0; j < sourceSettings.categories.length; ++j) {
        // If category is allowed for any type code set to this site, add it
        if (_.intersection(data.features[i].properties.typeCodes,
            sourceSettings.categories[j].typeCodes)[0]) {
          siteData.categories.push(sourceSettings.categories[j].categoryKey);
        }
      }
    }

    if (sourceSettings.attribution) {
      siteData.attribution = {};
      siteData.attribution.importSource = sourceSettings.attribution.sourceName;
      siteData.attribution.importUrl = sourceSettings.attribution.sourceUrl;
    }

    createNewRemoteSiteFromGeoJSON(geom, siteData);
  }
}

/**
 * If route is scattered to multiple features, combines them to one. Combines
 * route parts and categories. Used for routes of Lipas format.
 * @param  {Object} feature    GeoJSON feature to which other parts of the same
 *                             route are combined. Note that this object is
 *                             modified during the execution of this function:
 *                             if the feature represents a LineString and other
 *                             route parts need to be combined to it, it will
 *                             be changed to MultiLineString.
 * @param  {Array} allFeatures features of a GeoJSON feature collection. This
 *                             might be modified after combining routes.
 * @param  {Number} startIndex index of allFeatures array. All features before
 *                             this index are skipped for performance reasons.
 */
function combineRoutesToOne(feature, allFeatures, startIndex) {
  function lineStringToMultiLineString(geometry) {
    geometry.type = 'MultiLineString';
    geometry.coordinates = [geometry.coordinates];
  }

  var allTypeCodes = [feature.properties['tyyppikoodi']];
  for (var i = startIndex; i < allFeatures.length; ++i) {
    if (allFeatures[i] && allFeatures[i].properties['reitti_id'] ===
        feature.properties['reitti_id']) {

      // Route parts can not be combined to a single LineString
      if (feature.geometry.type !== 'MultiLineString') {
        lineStringToMultiLineString(feature.geometry);
      }

      /* Only combine route parts if they have the same type code.
       * If the compared features have different type codes, there SHOULD also
       * exist duplicate feature entries with the proper type code.
       * In that case, only save the type code and don't combine route parts,
       * because they will be combined anyway (when the type code matches). */
      if (allFeatures[i] && allFeatures[i].properties['tyyppikoodi'] !==
          feature.properties['tyyppikoodi']) {
        if (!_.contains(allTypeCodes, allFeatures[i].properties['tyyppikoodi']))
          allTypeCodes.push(allFeatures[i].properties['tyyppikoodi']);
      } else if (allFeatures[i].geometry.type === 'LineString') {
        feature.geometry.coordinates.push(allFeatures[i].geometry.coordinates);
      } else if (allFeatures[i].geometry.type === 'MultiLineString') {
        for (var j = 0; j < allFeatures[i].geometry.coordinates.length; ++j) {
          feature.geometry.coordinates.push(
            allFeatures[i].geometry.coordinates[j]);
        }
      }
      // There is no need to process this feature anymore.
      allFeatures[i] = null;
    }
  }
  feature.properties['typeCodes'] = allTypeCodes;
}

/**
 * If a place has different type codes, each of them is defined in a separate
 * feature. This function combines them to a single feature.
 * @param  {Object} feature    GeoJSON feature to which the data is combined.
 * @param  {Array} allFeatures features of a GeoJSON feature collection. This
 *                             might be modified after combining routes.
 * @param  {Number} startIndex index of allFeatures array. All features before
 *                             this index are skipped for performance reasons.
 */
function combinePlacesToOne(feature, allFeatures, startIndex) {
  var allTypeCodes = [feature.properties['tyyppikoodi']];
  for (var i = startIndex; i < allFeatures.length; ++i) {
    if (allFeatures[i] && allFeatures[i].properties['sijainti_id'] ===
        feature.properties['sijainti_id']) {
      allTypeCodes.push(allFeatures[i].properties['tyyppikoodi']);

      // There is no need to process this feature anymore.
      allFeatures[i] = null;
    }
  }
  feature.properties['typeCodes'] = allTypeCodes;
}

/**
 * @see createNewRemoteSites
 */
function createNewRemoteSitesTampereFormat(data, sourceSettings) {
  if (data.type !== 'FeatureCollection' || !data.features) {
    console.log('Invalid GeoJSON object type. ' +
                'Only FeatureCollections are supported.');
    return;
  }
  console.log('Starting to add ' + data.features.length + ' sites!');

  for (var i = 0; i < data.features.length; ++i) {
    var geom = data.features[i].geometry;
    if (!geom) continue;

    var siteData = {
      importId: sourceSettings.idPrefix + '-' +
                (data.features[i].properties.id || data.features[i].id),
      name: data.features[i].properties['NIMI'] ||
            data.features[i].properties['TOIMLK'], // fallback
      type: geom.type
    };

    // If the name is all uppercase, capitalize only the first letter
    var S = Meteor.require('string');
    if (S(siteData.name).isUpper()) {
      siteData.name = S(siteData.name).capitalize().toString();
    }

    // If the site didn't have proper name defined, append area name to the name
    if (!data.features[i].properties['NIMI']) {
      siteData.name += ' - ' +
        S(data.features[i].properties['ALUE_NIMI']).capitalize().toString();
    }

    if (sourceSettings.categories) {
      siteData.categories = [];
      for (var j = 0; j < sourceSettings.categories.length; ++j) {
        siteData.categories.push(sourceSettings.categories[j].categoryKey);
      }
    }

    if (sourceSettings.attribution) {
      siteData.attribution = {};
      siteData.attribution.importSource = sourceSettings.attribution.sourceName;
      siteData.attribution.importUrl = sourceSettings.attribution.sourceUrl;
    }

    createNewRemoteSiteFromGeoJSON(geom, siteData);
  }
}

/**
 * @param  {Object} geometry GeoJSON geometry object containing site geometry.
 * @param  {Object} siteData see createSiteObject function for
 *                           required properties.
 */
function createNewRemoteSiteFromGeoJSON(geometry, siteData) {
  switch (geometry.type) {
    case 'Point':
      siteData.location = geometry.coordinates;
      addPlaceFromRemote(siteData);
      break;
    case 'Polygon':
      siteData.location = SiteService.getAveragePoint(geometry.coordinates[0]);
      addPlaceFromRemote(siteData);
      break;
    case 'LineString':
      siteData.coordinates = geometry.coordinates;
      addRouteFromRemote(siteData);
      break;
    case 'MultiLineString':
      siteData.coordinates = geometry.coordinates;
      addRouteFromRemote(siteData);
      break;
    default:
      console.log('Invalid GeoJSON geometry object type \"' + geometry.type +
                  '\". Only following types are supported: \"Point\", ' +
                  '\"Polygon\", \"LineString\", \"MultiLineString\".');
      break;
  }
}

/**
 * @see createNewRemoteSites
 */
function createNewRemoteSitesFillaristitFormat(data, sourceSettings) {
  console.log('Starting to add ' + Object.keys(data).length + ' sites!');

  for (var item in data) {
    var id = sourceSettings.idPrefix + '-' + data[item].id;
    var site = Sites.findOne({importId: id});
    if (site) continue;

    var siteData = {
      importId: id,
      name: data[item].title,
      description: data[item].body
    };

    if (sourceSettings.categories && data[item].category_id) {
      siteData.categories = [];
      for (var i = 0; i < sourceSettings.categories.length; ++i) {
        var sc = sourceSettings.categories[i];
        if ((!sc.categoryId || sc.categoryId == data[item].category_id) &&
            (!sc.type || sc.type === data[item].type) &&
            typeof sc.categoryKey === 'string') {
          siteData.categories.push(sc.categoryKey);
        }
      }
    }

    if (sourceSettings.attribution) {
      siteData.attribution = {};
      siteData.attribution.importSource = sourceSettings.attribution.sourceName;
      siteData.attribution.importUrl = sourceSettings.attribution.sourceUrl.
                                        replace('__id__', data[item].id || '');
    }

    // Only create mountain cycling and swimming places.
    if (data[item].type === 'place' &&
        (data[item].category_id == '11' || data[item].category_id == '21')) {
      siteData.location = [parseFloat(data[item].lon),
                           parseFloat(data[item].lat)];
      addPlaceFromRemote(siteData);
    } else if (data[item].type === 'route') {
      // Parse coordinate pairs
      var singleCoords = data[item].route_coords.split(/[\s,]/);
      siteData.coordinates = [];
      siteData.type = 'LineString';
      for (var i = 1; i < singleCoords.length; i=i+2) {
        siteData.coordinates.push([parseFloat(singleCoords[i-1]),
                                   parseFloat(singleCoords[i])]);
      }
      addRouteFromRemote(siteData);
    }
  }
}

/**
 * Creates a new route based on remote data.
 * Does nothing if the site exists already.
 * @param  {Object} data               see createSiteObject function for
 *                                     required properties.
 * @param  {Array}  data.coordinates   if 'type' is 'LineString', this is an
 *                                     ordered list of [lng, lat] coordinate pairs.
 *                                     If 'type' is 'MultiLineString', this is an
 *                                     array which can contain multiple ordered
 *                                     lists of [lng, lat] coordinate pairs.
 * @param  {String} data.type          GeoJSON type, either 'LineString' or
 *                                     'MultiLineString'.
 */
function addRouteFromRemote(data) {
  if (!data.importId || !data.coordinates || !data.type) {
    return;
  }

  var geometryObject = {type: data.type, coordinates: data.coordinates};
  // Don't add site if it exists already.
  if (Sites.findOne({$or: [
      {importId: data.importId},
      {routeData: geometryObject}]})) {
    return;
  }

  var newRoute = createSiteObject(data);
  if (!newRoute) return false;

  newRoute.routeData = geometryObject;

  var area;
  var center;
  var length = 0;
  if (data.type === 'LineString') {
    data.coordinates = SiteService.simplifyRoute(data.coordinates);
    area = SiteService.getBoundingArea(data.coordinates);
    center = SiteService.getAveragePoint(data.coordinates);
    for (var i = 1; i < data.coordinates.length; ++i) {
      length += SiteService.pointDistance(data.coordinates[i-1],
                                          data.coordinates[i]);
    }
  } else if (data.type === 'MultiLineString') {
    var allCoords = [];
    for (var i = 0; i < data.coordinates.length; ++i) {
      data.coordinates[i] = SiteService.simplifyRoute(data.coordinates[i]);
      // Total length of different line segments
      for (var j = 1; j < data.coordinates[i].length; ++j) {
        length += SiteService.pointDistance(data.coordinates[i][j-1],
                                            data.coordinates[i][j]);
      }
      allCoords = allCoords.concat(data.coordinates[i]);
    }

    area = SiteService.getBoundingArea(allCoords);
    center = SiteService.getAveragePoint(allCoords);
  } else {
    return;
  }

  newRoute.area = SiteService.getBoundingGeoJson(area);
  newRoute.location = {type: 'Point', coordinates: center};
  newRoute.routeLength = length;

  var siteId;
  if (area && center && length) {
    siteId = Sites.insert(newRoute);
  }

  if (siteId) {
    ++sitesAdded;
    ArchiveUtilities.archiveSite({
      siteId: siteId,
      userId: '???',
      oldData: newRoute,
      imported: true
    });
  }
}

/**
 * Creates a new place based on remote data.
 * Does nothing if the site exists already.
 * @param  {Object} data          see createSiteObject function for required
 *                                properties.
 * @param  {Array}  data.location [lng, lat] coordinates
 */
function addPlaceFromRemote(data) {
  if (!data.importId || !data.location ||
      !data.location[0] || !data.location[1]) {
    return false;
  }

  var site = Sites.findOne({importId: data.importId}) ||
             Sites.findOne({'location.coordinates': data.location});
  if (site) return;

  var newPlace = createSiteObject(data);
  if (!newPlace) return false;

  newPlace.location = {
    type: 'Point',
    coordinates: data.location
  };

  var siteId = Sites.insert(newPlace);
  if (siteId) {
    ++sitesAdded;
    ArchiveUtilities.archiveSite({
      siteId: siteId,
      userId: '???',
      oldData: newPlace,
      imported: true
    });
  }
}

/**
 * Creates and returns a site object that holds (some but not all) properties
 * which are required for both places and routes.
 * @param  {String}  data.importId     unique id that can be used to identify
 *                                     this site if its data changes.
 * @param  {String} [data.name]        initial name. Only set if site is new.
 * @param  {String} [data.description] initial description. Only set if site is new.
 * @param  {Array}  [data.categories]  an ordered list of category key strings
 * @param  {Object} [data.attribution] has following properties:
 *                                     - importSource: string, name of the source
 *                                     - importUrl: string, url of the source
 * @return {Object} the created site object
 */
function createSiteObject(data) {
  if (!data.importId || (data.attribution && !data.attribution.importSource &&
      !data.attribution.importUrl)) {
    return null;
  }

  var site = {importId: data.importId, name: data.name || '',
              description: data.description || '',
              categories: data.categories || []};

  if (data.attribution) {
    site.importDate = new Date();
    site.importSource = data.attribution.importSource;
    site.importUrl = data.attribution.importUrl;
  }

  site.points = 0;

  return site;
}
