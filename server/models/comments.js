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

var MAX_COMMENT_LENGTH = 4096;

Meteor.methods({
  /**
   * Validate and create a new comment.
   * @param  {Object} comment holds the comment data. See Comments collection.
   * @return {String}         on success returns the id of the created comment.
   *                          On failure returns false.
   */
  insertComment: function(comment) {
    var userId = Meteor.userId();

    if (!userId || !comment.author || !comment.text || !comment.site)
      return false;

    // The client supplied timestamp is too unreliable to be of any use
    comment.dateTime = new Date();

    // Type check
    try {
      check(comment.author, String);
      check(comment.text, String);
      check(comment.site, String);
      check(comment.dateTime, Date);
    } catch (e) {
      return false;
    }

    if (userId !== comment.author)
      return false;

    // Sites may not exist if attempting to insert too early during startup
    try {
      if (!Sites.findOne({_id: comment.site}))
        return false;
    } catch (e) {
      return false;
    }

    if (comment.text.length === 0 || comment.text.length > MAX_COMMENT_LENGTH)
      return false;

    if (comment.picture) {
      try {
        check(comment.picture, String);
      } catch (e) {
        return false;
      }

      if (comment.picture.search('https://s3-' + S3.region +
          '.amazonaws.com/' + S3.bucket + '/images/') !== 0)
        return false;
    }

    // Check if some alien properties have been inserted
    for (var p in comment) {
      if (!(p === '_id' || p === 'text' || p === 'author' || p === 'site' ||
          p === 'dateTime' || p === 'picture'))
        return false;
    }

    // Points for adding a comment
    var sitePoints = Meteor.settings.pointsGiven.site.comment;
    var userPoints = Meteor.settings.pointsGiven.user.comment;

    // Points for adding a picture
    if (_.has(comment, 'picture')) {
      sitePoints += Meteor.settings.pointsGiven.site.addPicture;
      userPoints += Meteor.settings.pointsGiven.user.addPicture;
    }

    Sites.update(comment.site, {$inc: {points: sitePoints}});
    Meteor.users.update(comment.author, {$inc: {points: userPoints}});

    return Comments.insert(comment);
  }
});

Meteor.startup(function() {
  Comments.allow({
    // Creating comments must be done with insertComment method
    insert: function(userId, comment) {
      return false;
    },
    // Only allow users to "delete" their own comments
    update: function(userId, doc, fields, modifier) {
      if (!userId || !doc || !doc.author || doc.author !== userId)
        return false;

      for (var mod in modifier) {
        if (mod !== '$unset') return false;
      }

      for (var i = 0; i < fields.length; i++) {
        if (fields[i] !== 'text' || fields[i] !== 'picture') return false;
      }

      /* Users will have already gotten points for adding a comment so the net
       * sum will be zero */
      Meteor.users.update(userId, {$inc:
        {points: -Meteor.settings.pointsGiven.user.comment}});

      return true;
    },
    remove: function(userId) {
      var user = Meteor.users.findOne(userId);
      if (user && user.isAdmin) {
        return true;
      } else {
        return false;
      }
    }
  });

  Meteor.publish('siteComments', function(siteId) {
    if (!siteId) {
      console.error('Error publishing \'siteComments\': Must give a site id.');
      return;
    }
    return Comments.find({site: siteId});
  });

  Meteor.publish('userComments', function(userId) {
    if (!userId) {
      console.error('Error publishing \'userComments\': Must give a user id.');
      return;
    }
    return Comments.find({author: userId});
  });

  Meteor.publish('adminComments', function() {
    return Comments.find();
  });
});
