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

/* Meteor.users collection contains all users.
 * This file only holds the documentation of this collection.
 *
 * Entries contain all properties that Meteor.users collection normally has
 * (see http://docs.meteor.com/#meteor_users).
 * The following conventions are used for these properties:
 * - username is not used.
 * - each user should only have one email. This email can be changed.
 *
 * Additional properties:
 *   profile.name: string. The name of the user. Can be changed. Not unique.
 *
 *   isAdmin: true if the user has been granted admin rights, in which case
 *   he/she can view the administration view. Otherwise undefined.
 *
 *   emailHash: An MD5 hash of the users email address. Used for Gravatar.
 *
 *   banHistory: an array, ordered list of the bans the user has received.
 *   Not required. Contains objects with following properties:
 *   - start: Javascript Date object, when the ban was given
 *   - end: Javascript Date object, when the ban ends
 *   - reason: String, reason of the ban.
 *
 *   points: The number of points the user has gained. These points are used to
 *   determine top users list ranking. A user can gain points by contributing to
 *   the service, for example creating routes or submitting photos. This is a
 *   required property.
 */
