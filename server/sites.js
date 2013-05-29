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

Meteor.methods({
  /**
   * Try to set locality info for all sites that don't have it.
   * Only allowed for admin users.
   */
  startAddingMissingLocalities: function() {
    if (this.userId &&
        Meteor.users.findOne({_id: this.userId, isAdmin: true})) {
      this.unblock();
      console.log('User ' + this.userId + ' initiated localities update.');
      addMissingLocalities();
    }
  },

  /**
   * Attemps to delete a site. The site is not deleted permanently: the current
   * state of the site is archived, and only then it is deleted from Sites.
   * @return {Boolean}       true if operation succeeded
   */
  deleteSite: function(siteId) {
    var userId = Meteor.userId();
    if (!Meteor.user() || !userId) {
      console.log('Deleting site with id ' + siteId +
          ' failed: No user logged in.');
      return false;
    }

    if (!UserService.isEmailVerified(userId) ||
        !checkUserForDbOperations(userId)) {
      return false;
    }

    var site = Sites.findOne(siteId);

    var latestData = ArchivedSites.findOne({site: siteId},
      {sort: {seq: -1}, fields: {data: 1}});

    // Don't delete site if it hasn't been archived
    var archiveId = null;
    if (!latestData) {
      archiveId = ArchiveUtilities.archiveSite({
        siteId: siteId,
        userId: Meteor.userId(),
        oldData: site,
        deleted: true,
        name: site.name
      });
    } else {
      archiveId = ArchiveUtilities.createArchiveEntry({
        site: siteId,
        author: userId,
        data: latestData.data,
        deleted: true,
        name: site.name});
    }

    if (!archiveId) {
      throw new Meteor.Error(500, 'Site deletion failed: could not archive.');
    }

    Comments.update({site: siteId}, {$set: {siteName: site.name}},
                    {multi: true});

    decrementSiteCount(site.mainLocalityId);

    Sites.remove(siteId);

    return true;
  },

  /**
   * Attempts to fetch address info for given location.
   * @param  {Number} lat latitude
   * @param  {Number} lng longitude
   * @return {Object|undefined} on success returns an object with following
   *     properties:
   *     - terms, an array that contains strings. See localities property in
   *       Sites collection.
   *     - [mainLocalityId] id of a Localities collection entry (see
   *       mainLocalityId in Sites collection).
   */
  getAddressInfo: function(lat, lng) {
    if (!lat || !lng) return false;

    var url = 'http://open.mapquestapi.com/nominatim/v1/reverse' +
              '?format=json&zoom=16&addressdetails=1' +
              '&lat=' + lat + '&lon=' + lng;

    try {
      var result = Meteor.http.call('GET', url, {timeout: 15000});

      if (result && result.data && result.data.address) {
        var country = result.data.address.country;
        // Delete useless fields
        delete result.data.address.country;
        delete result.data.address.country_code;
        delete result.data.address.continent;

        var localityTerms = [];
        var cityTerm = null;
        for (var prop in result.data.address) {
          if (prop === 'city') {
            cityTerm = result.data.address[prop].toLowerCase();
          } else {
            localityTerms.push(result.data.address[prop].toLowerCase());
          }
        }

        _createNewLocalities(localityTerms, cityTerm, country);

        var mainLocality = Localities.findOne({name: cityTerm});
        var returnValue = {terms: localityTerms};
        if (mainLocality) {
          returnValue.mainLocalityId = mainLocality._id;
          returnValue.terms.push(mainLocality.name);
        }
        return returnValue;
      } else {
        console.log('Error: could not fetch address info.');
        console.log(result);
      }
    } catch (error) {
      console.log('Could not fetch address info.');
      console.error(error);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  }
});

/**
 * Attempts to create new entries to Localities collection.
 * @param  {Array} terms       an array of locality names (strings) to add
 * @param  {[String]} cityTerm location info is attached to this locality. May
 *                             or may not be included in terms array.
 * @param  {[String]} country  what country the city should belong to. Useful
 *                             because multiple countries might contain cities
 *                             with same name.
 */
function _createNewLocalities(terms, cityTerm, country) {
  if (!terms) return;

  /* Process cityterm before other localities so that it doesn't matter if
   * it's included in terms. */
  if (cityTerm &&
      !Localities.findOne({name: cityTerm, location: {$exists: true}})) {
    try {
      var cityLocality = {name: cityTerm};
      var url = 'http://open.mapquestapi.com/nominatim/v1/search' +
                '?format=json&city=' + encodeURIComponent(cityTerm);
      if (country) {
        url += '&country=' + encodeURIComponent(country);
      }
      var result = Meteor.http.call('GET', url, {timeout: 15000});

      // Even if there are many results, only look at the first one.
      if (result && result.data && result.data[0] && result.data[0].lat &&
          result.data[0].lon) {
        cityLocality.location = [parseFloat(result.data[0].lon),
                                 parseFloat(result.data[0].lat)];
        cityLocality.siteCount = 0;

        /* If the locality already exists but doesn't have location info,
         * set it. Otherwise create a new locality. */
        var currentCityLocality = Localities.findOne(
          {name: cityTerm, location: {$exists: false}});
        if (currentCityLocality) {
          cityLocality.siteCount = currentCityLocality.siteCount || 0;
          Localities.update(currentCityLocality._id, {$set: cityLocality});
        } else {
          Localities.insert(cityLocality);
        }
      } else {
        console.log('Error: could not create city locality \'' + cityTerm + '\'.');
        console.log(result);
      }
    } catch (error) {
      console.log('Could not create city locality \'' + cityTerm + '\'.');
      console.error(error);
    }
  }

  for (var i = 0; i < terms.length; ++i) {
    if (!Localities.findOne({name: terms[i]})) {
      var locality = {name: terms[i]};
      Localities.insert(locality);
    }
  }
}

incrementSiteCount = function(localityId) {
  if (localityId) {
    // Note: If the field doesn't exist, its value is set to 1.
    Localities.update(localityId, {$inc: {siteCount: 1}});
  }
};

decrementSiteCount = function(localityId) {
  if (localityId) {
    Localities.update({_id: localityId, siteCount: {$gt: 0}},
                      {$inc: {siteCount: -1}});
  }
};

updateSiteCount = function(oldSite, newSite) {
  // Update site count if the main locality has changed
  if (!(oldSite.mainLocalityId && newSite.mainLocalityId &&
        oldSite.mainLocalityId === newSite.mainLocalityId)) {

    // Decrement the count according to the old locality
    decrementSiteCount(oldSite.mainLocalityId);

    // Increase the count according to the new locality
    incrementSiteCount(newSite.mainLocalityId);
  }
};

/**
 * Global function because this is used from data import as well.
 * Finds all sites that don't have locality info, and adds it to the site and
 * its archive entries.
 */
addMissingLocalities = function() {
  if (localityAddInProgress) return;
  localityAddInProgress = true;

  var siteCursor = Sites.find({localities: {$exists: false}});
  console.log('Starting to add localities to ' + siteCursor.count() + ' sites.');
  console.time('Locality load timer');

  siteCursor.forEach(function(site) {
    _addMissingLocalityInfoToSite(site);
  });

  console.log('Finished adding locality info!');
  console.timeEnd('Locality load timer');
  localityAddInProgress = false;
};
var localityAddInProgress = false;

/**
 * Adds locality info to current version of the site and all archived versions,
 * if they don't have the info set already.
 * @param {String} site entry of Sites collection to be modified.
 */
function _addMissingLocalityInfoToSite(site) {
  if (site && site.location && site.location.coordinates) {
    var center = site.location.coordinates;
    var localities  = Meteor.call('getAddressInfo', center[1], center[0]);
    if (localities) {
      // Add site localities to current version if they aren't set already.
      if (!site.localities) {
        var mainLocality = Localities.findOne(localities.mainLocalityId,
            {fields: {siteCount: true}}
        );
        var siteModifier = {$set: {localities: localities.terms}};
        if (mainLocality) {
          incrementSiteCount(localities.mainLocalityId);
          siteModifier['$set'].mainLocalityId = mainLocality._id;
        }
        Sites.update(site._id, siteModifier);
      }

      /* Set localities for all archive entries (if any). This is to prevent
       * losing locality info if site revisions are restored. */
      ArchivedSites.find({site: site._id}).forEach(function(item) {
        var archiveData = ArchivedSiteData.findOne(item.data);
        if (archiveData && !archiveData.localities) {
          ArchivedSiteData.update(archiveData._id,
                                  {$set: {localities: localities}});
        }
      });
    }
  }
}
