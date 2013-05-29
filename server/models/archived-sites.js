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

Meteor.startup(function() {
  ArchivedSites.allow({
    insert: function() {
      return false;
    },
    update: function() {
      return false;
    },
    remove: function() {
      return false;
    }
  });

  // Returns all archive entries of a single site.
  Meteor.publish('siteArchiveEntries', function(siteId) {
    return ArchivedSites.find({site: siteId});
  });

  // Returns latest summarized archive entries for administration use
  Meteor.publish('archiveEntrySummaries', function(limit) {
    return ArchivedSites.find({}, {fields: {site: 1, author: 1, timestamp: 1},
      sort: {timestamp: -1}, limit: limit});
  });

  // Returns all archive entries where a site has been deleted.
  // Note that this subscription is *not* reactive.
  Meteor.publish('siteArchivesAllDeleted', function() {

    ArchivedSites.find({deleted: true}).forEach(_.bind(function(entry) {
      // Check if the entry is the latest delete entry.
      if (!Sites.findOne(entry.site) &&
          ArchivedSites.findOne({site: entry.site},
          {sort: {seq: -1}})._id === entry._id) {
        this.added('archived-deleted-sites', entry._id, entry);
      }
    }, this));

    this.ready();
  });
});
