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

/* Datamodel representing a comment
 *
 * Properties:
 *   text: string the comment text. If this field is not set, the
 *   comment has been deleted.
 *
 *   author: id of the authored user
 *
 *   site: id of the site this comment relates to
 *
 *   picture: url of the picture, if any. Can be undefined.
 *
 *   dateTime: JavaScript Date-object representing the date and time when
 *   the comment was created */
Comments = new Meteor.Collection("comments");

// This is here so that the client can execute the stub
Meteor.methods({
  deleteComment: function(commentId) {
    var comment = Comments.findOne({_id: commentId});
    if (comment && comment.author && comment.author === this.userId) {
      Comments.update(commentId, {$unset: {text: true, picture: true}});
    }
  }
});
