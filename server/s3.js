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

S3 = {
  initialized: false,
  s3: null,
  bucket: null,
  region: null,

  init: function() {
    AWS.config.update({
      accessKeyId: Meteor.settings.AWS.accessKeyId,
      secretAccessKey: Meteor.settings.AWS.secretAccessKey
    });

    this.region = Meteor.settings.AWS.region;
    this.bucket = Meteor.settings.AWS.S3Bucket;

    this.s3 = new AWS.S3({
      region: this.region
    });

    this.initialized = true;
  },

  /**
   * Upload a file to Amazon S3
   * @param {String} name The name of the file including folder path.
   *                      Example: 'images/1234.jpg'
   * @param {Buffer} buffer Data to be uploaded
   * @param {Function} callback The URL (as a String. Will be null if the upload
   *                            failed) to the file will be passed to this
   * @param {Object} [options] A set of extra parameters. If omitted, defaults
   *                           are used
   * @param {String} [options.contentType='application/octet-stream']
   *        MIME type of the data
   * @param {Boolean} [options.reducedRedundancy=false]
   *        true: Reduced Redundancy Storage option is used;
   *        false: Standard Storage option is used
   */
  upload: function(name, buffer, callback, options) {
    if (!this.initialized)
      throw new Meteor.Error(500, 'S3 not initialized');

    if (!options) {
      options = {};
    }
    if (options.contentType === undefined) {
      options.contentType = 'application/octet-stream';
    }
    if (options.reducedRedundancy === undefined) {
      options.reducedRedundancy = false;
    }

    console.log('Uploading ' + name + ' (size: ' + buffer.length + ' bytes)');

    var fut = new Future(); // Begins an asynchronous operation
    this.s3.putObject({
        Bucket: this.bucket,
        ACL: 'public-read',
        Key: name,
        ContentType: options.contentType,
        StorageClass: options.reducedRedundancy ?
          "REDUCED_REDUNDANCY" : "STANDARD",
        Body: buffer
      },
      _.bind(function(error, result) {
        if (error) {
          console.log(error);
          fut.ret(null);
        } else {
          console.log('Uploading ' + name + ' complete. Etag: ' + result.ETag);
          // Stop blocking the fiber and return
          fut.ret('https://s3-' + this.region + '.amazonaws.com/' +
           this.bucket + '/' + name);
        }
      }, this)
    );
    // Blocks the fiber. Waits until fut.ret() is called and returns its arguments.
    callback(fut.wait());
  }
};

Meteor.startup(function() {
  if (Meteor.settings.AWS) {
    S3.init();
  } else {
    console.warn('Amazon S3 is not configured. Adding images to sites and comments will not work.');
  }
});
