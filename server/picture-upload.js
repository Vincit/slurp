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

Future = Npm.require('fibers/future');

Meteor.methods({
  /**
   * Attempts to upload pictures and save their urls to a site.
   * @param  {String} siteId
   * @param  {Array} blobs   an array of Uint8Arrays, each of which contains
   *                         the data for one picture.
   * @return {Boolean}       true on success.
   */
  uploadSitePictures: function(siteId, blobs) {
    if (!checkUserForDbOperations(this.userId)) return false;

    processImagesAndUpload(blobs, function(urls) {
      /* The database update is done only after all pictures have been
       * successfully uploaded.*/
      Sites.update(siteId, {$push: {pictures: {$each: urls}}, $inc:
        {points: Meteor.settings.pointsGiven.site.addPicture}});

      Meteor.users.update(this.userId, {$inc:
        {points: Meteor.settings.pointsGiven.user.addPicture}});
    });
    return true;
  },
  /**
   * Attemps to upload a single comment picture.
   * @param  {Array} blobs contains a Uint8Array that holds the picture data.
   * @return {String}      on success return the url of the uploaded picture.
   */
  uploadCommentPicture: function(blobs) {
    if (!checkUserForDbOperations(this.userId)) return false;

    var pictureUrl;
    processImagesAndUpload(blobs.slice(0,1), function(url) {
      pictureUrl = url;
    });

    return pictureUrl;
  }
});

/**
 * Processes the images so that they are the correct size and generates
 * thumbnails for them. They are then uploaded to Amazon S3 and a list of URLs
 * pointing to the fullsized images is returned.
 *
 * @param  {Array} buffers A list of picture buffers
 * @return {Array} A list URLs to the uploaded pictures
 */
function processImagesAndUpload(blobs, callback) {
  var fileUrls = [];
  var thumbnailUploadedCount = 0;
  var resizedUploadedCount = 0;

  for (var i = 0; i < blobs.length; i++) {
    if (blobs[i].length > Meteor.settings.public.maxFileSize)
      throw new Meteor.Error(500, 'Image file too large');

    var name = 'images/' + Math.random().toString().slice(2);
    var buffer = new Buffer(blobs[i]);

    var thumbnail = ImageUtils.cropToSquareAndFit(buffer, 72);
    var resized = ImageUtils.resizeToFit(buffer, 1024);

    if (!thumbnail || !resized) {
      console.log('Image processing failed');
      throw new Meteor.Error(500, 'Image processing failed');
    }

    S3.upload(name + '-t', thumbnail, function(url) {
      if (!url)
        throw new Meteor.Error(500, 'Uploading to S3 failed');
      thumbnailUploadedCount++;

      if (resizedUploadedCount === blobs.length &&
          thumbnailUploadedCount === blobs.length)
        callback(fileUrls);
    }, {contentType: 'image/jpeg', reducedRedundancy: true});

    S3.upload(name, resized, function(url) {
      if (!url)
        throw new Meteor.Error(500, 'Uploading to S3 failed');
      fileUrls.push(url);
      resizedUploadedCount++;

      if (resizedUploadedCount === blobs.length &&
          thumbnailUploadedCount === blobs.length)
        callback(fileUrls);
    }, {contentType: 'image/jpeg', reducedRedundancy: true});
  }
}
