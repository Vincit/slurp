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

/* Datamodel representing a site (route or place)
 *
 * Properties:
 *   name: string containing the name of the site. Required, but can be en
 *   empty string.
 *
 *   importId: string. Unique id that identifies the site from its original data
 *   source. Can be used when checking if the data has already been imported or
 *   if the data has been updated after previous import.
 *   importDate: JavaScript Date object. When the site import was done.
 *   importSource: string, name of the import source.
 *   importUrl: string, link to import source.
 *
 *   routeData: GeoJSON geometry object, contains route data of the site. Only
 *   set if the site represents a route.
 *
 *   location: The apparent location of the site. Used when ranking search
 *   results based on site location and on low zoom levels when only drawing a
 *   point instead of a route. The data type is GeoJSON Point.
 *
 *   localities: an array that contains locality terms (strings), which can be
 *   used for site searching. Not required, can be empty. Each term must
 *   correspond to the name field of an entry in Localities collection.
 *
 *   mainLocalityId: Id of the main locality entry. Typically city. Used for
 *   showing the count of sites on map per main locality.
 *
 *   area: A rectangular area that limits this site. Not defined if site
 *   represents a place. For routes, contains a GeoJSON Polygon of the
 *   following format: The first coordinate pair is the north west point.
 *   Then north east, south east, south west and finally north west.
 *
 *   categories: a list of categories to which the site belongs. The actual value
 *   should be a localization key. The list can be empty.
 *
 *   description: A long text description of the site. Can be an empty string.
 *
 *   routeLength: Length of the route in metres as a number.
 *
 *   pictures: An optional array of picture URLs.
 *
 *   points: A number used to determine site popularity. Is required.
 */
Sites = new Meteor.Collection('sites');
