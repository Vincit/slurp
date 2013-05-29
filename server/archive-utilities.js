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

ArchiveUtilities = (function() {
  'use strict';

  var ArchiveUtilities = {
    /**
     * Creates an archived entry of the site. This should be called whenever
     * the site is changed.
     * @param  {Object} data Has following properties:
     *                       siteId {String} id of the archived site
     *                       userId {String} id of the user that made the changes
     *                       oldData {Object} current data of this site in same
     *                                        format as Sites collection entries.
     *                       [newData] {Object} data that overwrites old data.
     *                                          Can contain only properties that
     *                                          Sites collection entries have.
     *                       [deleted] {Boolean} true if site was deleted
     *                       [imported] {Boolean} true if site was imported
     *                       [name] {String} current name of the site. Only set
     *                                       when deleted was set as well.
     * @return {Boolean|String} false if archiving failed, otherwise the id of
     *                          the created ArchivedSites collection entry.
     */
    archiveSite: function(data) {
      function copyProperties(source, target) {
        for (var property in source) {
          target[property] = source[property];
        }
      }

      var archiveData = {};
      copyProperties(data.oldData, archiveData);
      copyProperties(data.newData, archiveData);
      // Site id (_id) might've been in newData or oldData, clear it.
      delete archiveData._id;

      var archiveDataId = ArchivedSiteData.insert(archiveData);

      if (!archiveDataId)
        return false;

      var entryData = {
        site: data.siteId,
        author: data.userId,
        data: archiveDataId
      };
      if (data.deleted) {
        entryData.deleted = true;
        // Make sure name isn't undefined
        entryData.name = data.name ? data.name : '';
      }
      if (data.imported) {
        entryData.imported = true;
      }

      var archiveId = this.createArchiveEntry(entryData);

      if (!archiveId) {
        ArchivedSiteData.remove(archiveDataId);
        return false;
      }

      return archiveId;
    },

    /**
     * Creates an archive entry for site. Assumes that the data is already
     * inserted to ArchivedSiteData collection.
     * @param  {Object} data Same format as ArchivedSites collection entries.
     *                       Must include all non-optional properties except the
     *                       following, which are set automatically:
     *                       - seq, timestamp
     * @return {String | undefined} Id of the created archive entry or undefined
     *                              if failure occured.
     */
    createArchiveEntry: function(data) {
      if (!(data['site'] && data['author'] && data['data'])) return undefined;

      var highestSeq = ArchivedSites.findOne({site: data.site},
                                             {sort: {seq: -1},
                                             fields: {seq: 1}});

      data.seq = highestSeq ? highestSeq.seq + 1 : 1;
      data.timestamp = new Date();

      try {
        return ArchivedSites.insert(data);
      } catch (err) {
        return undefined;
      }
    }
  };

  return ArchiveUtilities;
})();
