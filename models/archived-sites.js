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

/* Datamodel representing an archived site entry. Holds the metadata of the
 * change. The actual data is held in ArchivedSiteData collection.
 *
 * Properties:
 *   site: Id of the site.
 *   author: Id of the user who made the archived change.
 *   data: Id of the ArchivedSiteData collection entry that holds data
 *         belonging to this change.
 *   seq: Sequence number. First entry for site has sequence number 1.
 *        Entries of different sites have separate sequence number sequences.
 *   timestamp: JavaScript Date-object, the time when change was made.
 *   original: (optional) Id of another ArchivedSites entry if this entry was
 *             restored and not a new one.
 *   deleted: (optional) True if the site was deleted in this change.
 *            Otherwise undefined.
 *   imported: (optional) True if the site was imported in this change.
 *             Otherwise undefined.
 *   name: (optional) Only present if deleted is set as well. Name of the site
 *         when it was deleted (can be an empty string). */

ArchivedSites = new Meteor.Collection('archived-sites');

/* Another collection for the same data model. This contains only entries,
 * which have a deleted property value true and only the latest such entry
 * for each site. This collection does not exist in the database and is merely
 * used for subscriptions. See server/models/archived-sites.js */
ArchivedDeletedSites = new Meteor.Collection('archived-deleted-sites');
