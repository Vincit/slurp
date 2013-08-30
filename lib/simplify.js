/*
 Copyright (c) 2013, Vladimir Agafonkin
 Simplify.js is a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

(function (global, undefined) {

  "use strict";


  // to suit your point format, run search/replace for '.x' and '.z';
  // to switch to 3D, uncomment the lines in the next 2 functions
  // (configurability would draw significant performance overhead)


  function getSquareDistance(p1, p2) { // square distance between 2 points

    var dx = p1[0] - p2[0],
  //      dz = p1[2] - p2[2],
        dy = p1[1] - p2[1];

    return dx * dx +
  //         dz * dz +
           dy * dy;
  }

  function getSquareSegmentDistance(p, p1, p2) { // square distance from a point to a segment

    var x = p1[0],
        y = p1[1],
  //      z = p1[2],

        dx = p2[0] - x,
        dy = p2[1] - y,
  //      dz = p2[2] - z,

        t;

    if (dx !== 0 || dy !== 0) {

      t = ((p[0] - x) * dx +
  //         (p[2] - z) * dz +
           (p[1] - y) * dy) /
              (dx * dx +
  //             dz * dz +
               dy * dy);

      if (t > 1) {
        x = p2[0];
        y = p2[1];
  //      z = p2[2];

      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
  //      z += dz * t;
      }
    }

    dx = p[0] - x;
    dy = p[1] - y;
  //  dz = p[2] - z;

    return dx * dx +
  //         dz * dz +
           dy * dy;
  }

  // the rest of the code doesn't care for the point format


  // basic distance-based simplification

  function simplifyRadialDistance(points, sqTolerance) {

    var i,
        len = points.length,
        point,
        prevPoint = points[0],
        newPoints = [prevPoint];

    for (i = 1; i < len; i++) {
      point = points[i];

      if (getSquareDistance(point, prevPoint) > sqTolerance) {
        newPoints.push(point);
        prevPoint = point;
      }
    }

    // MODIFIED: added check for point. This is to prevent undefined point from being added.
    if (point && prevPoint !== point) {
      newPoints.push(point);
    }

    return newPoints;
  }


  // simplification using optimized Douglas-Peucker algorithm with recursion elimination

  function simplifyDouglasPeucker(points, sqTolerance) {

    var len = points.length,

        MarkerArray = (typeof Uint8Array !== undefined + '')
                    ? Uint8Array
                    : Array,

        markers = new MarkerArray(len),

        first = 0,
        last  = len - 1,

        i,
        maxSqDist,
        sqDist,
        index,

        firstStack = [],
        lastStack  = [],

        newPoints  = [];

    markers[first] = markers[last] = 1;

    while (last) {

      maxSqDist = 0;

      for (i = first + 1; i < last; i++) {
        sqDist = getSquareSegmentDistance(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTolerance) {
        markers[index] = 1;

        firstStack.push(first);
        lastStack.push(index);

        firstStack.push(index);
        lastStack.push(last);
      }

      first = firstStack.pop();
      last = lastStack.pop();
    }

    for (i = 0; i < len; i++) {
      if (markers[i]) {
        newPoints.push(points[i]);
      }
    }

    return newPoints;
  }


  // both algorithms combined for awesome performance

  function simplify(points, tolerance, highestQuality) {

    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDistance(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
  };


  // export either as a Node.js module, AMD module or a global browser variable

  if (typeof exports === 'object') {
    module.exports = simplify;

  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return simplify;
    });

  } else {
    global.simplify = simplify;
  }

}(this));
