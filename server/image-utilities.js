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

ImageUtils = {
  /**
   * Resizes the image so that it's neither wider nor taller than the given
   * maximum dimension. In other words, the image is resized so that it fits
   * inside a square that has an edge length of maxDim. The original aspect
   * ratio is retained.
   *
   * @param {Buffer} srcBuf Source image
   *
   * @param {Number} maxDim Neither of the output image's dimensions should
   *                        exceed this value.
   *
   * @return {Buffer} A scaled version of the source image.
   */
  resizeToFit: function(srcBuf, maxDim) {
    var fut = new Future();
    gm(srcBuf)
      .resize(maxDim, maxDim, '>')
      .noProfile()  // Discard EXIF data
      .quality(80)
      .toBuffer('jpeg', _.bind(function(err, buffer) {
        fut.ret(this._checkResult(err, buffer));
      }, this));
    return fut.wait();
  },

  /**
   * Crops and resizes the the image so that the output is square. The output
   * area is the center of the image. The area included is as large as possible.
   *
   * @param  {Buffer} srcBuf Source image
   *
   * @param  {Number} dim The edge length of the output square image. Must be
   *                      smaller than or equal to the smallest source image
   *                      dimension.
   *
   * @return {Buffer} A cropped and resized square area from the center of
   *                  the source image
   */
  cropToSquareAndFit: function (srcBuf, dim) {
    var fut = new Future();
    gm(srcBuf)
      .resize(dim, dim, '^')
      .gravity('Center')
      .extent(dim, dim)
      .noProfile() // Discard EXIF data
      .quality(80)
      .toBuffer('jpeg', _.bind(function(err, buffer) {
        fut.ret(this._checkResult(err, buffer));
      }, this));
    return fut.wait();
  },

  _checkResult: function(err, buffer) {
    // If the image processing fails, GraphicsMagick returns an empty buffer
    if (err || !buffer || buffer.length === 0) {
      return null;
    }
    return buffer;
  }
};
