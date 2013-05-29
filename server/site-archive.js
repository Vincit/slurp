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

    restoreSiteRevision: function(revisionId) {
      if (!this.userId) {
        console.log('Restoring revision with id ' + revisionId +
                    ' failed: No user logged in.');
        return false;
      }

      if (!UserService.isEmailVerified(this.userId) ||
          !checkUserForDbOperations(this.userId)) {
        return false;
      }

      var archiveEntry = ArchivedSites.findOne(revisionId);
      if (!archiveEntry) return false;

      var archiveEntryData = ArchivedSiteData.findOne(archiveEntry.data);
      if (!archiveEntryData) return false;

      var targetSite = Sites.findOne(archiveEntry.site);

      var archiveId = ArchiveUtilities.createArchiveEntry({
        site: archiveEntry.site,
        author: this.userId,
        data: archiveEntryData._id,
        original: archiveEntry._id
      });
      if (!archiveId) return false;

      // Update all fields except _id and points
      delete archiveEntryData._id;

      if (targetSite) {
        archiveEntryData.points = targetSite.points;

        Sites.update(archiveEntry.site, archiveEntryData);
        updateSiteCount(targetSite, archiveEntryData);
      } else {
        archiveEntryData._id = archiveEntry.site;
        Sites.insert(archiveEntryData);
        incrementSiteCount(archiveEntryData.mainLocalityId);
      }

      return true;
    },

    /**
     * @return {Boolean} True if successful. False otherwise.
     */
    restoreLatestSiteRevision: function(siteId) {
      if (!this.userId) {
        console.log('Restoring site ' + siteId + ' from latest revision ' +
                    'failed: No user logged in.');
        return false;
      }

      if (!UserService.isEmailVerified(this.userId) ||
          !checkUserForDbOperations(this.userId)) {
        return false;
      }

      var latestRevision = ArchivedSites.findOne({site: siteId},
                                                 {sort: {'timestamp': -1}});
      if (!latestRevision) {
        return false;
      }

      try {
        return Meteor.call('restoreSiteRevision', latestRevision._id);
      } catch (e) {
        return false;
      }
    }
  });

}());
