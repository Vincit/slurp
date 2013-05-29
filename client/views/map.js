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

var map;
routeOverlay = null;
placeOverlay = null;
routeEditor = undefined;
placeEditor = undefined;
var userLocMarker = null;
var userLocCircle = null;

var siteSubscription = null;
var routeSubscription = null;
var placeSubscription = null;

/* This is used to fix a problem that happens with WebKit/Blink browsers.
 * See client/views/top-view.js and code below that updates the value of
 * this variable. */
mapDragInProgress = false;

Template.map.rendered = function() {
  map = L.map('map', {
      center: [61.5, 23.75],
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });
  // Hide Leaflet's default "Leaflet" attribution
  map.attributionControl.setPrefix('');
  L.Icon.Default.imagePath = '/images/leaflet';
  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: i18n.t('map.osmAttribution')
    }).addTo(map);

  routeEditor = new RouteEditor(map);
  placeEditor = new PlaceEditor(map);

  routeOverlay = new RouteOverlay(map);
  placeOverlay = new PlaceOverlay(map);

  siteCountOverlay(map);

  SiteLoadSpinner.init();

  map.on('click', onClick);
  map.on('dragstart', function() {
    LocateWatch.stop();
  });
  map.on('moveend', function() {
    MapUtilities.updateSiteSubscription();
  });
  map.on('zoomend', function() {
    MapUtilities.updateSiteSubscription();
  });

  // Try to locate user so we can show distance on search results.
  map.once('locationfound', function(e) {
    LocateWatch.userLocation = e.latlng;
  });
  map.locate({
    timeout: 15000
  });

  /* This is used to fix a problem that happens with WebKit/Blink browsers.
   * See client/views/top-view.js for further explanation. */
  map.on('dragstart', function(e) {
    mapDragInProgress = true;
  });
  map.on('dragend', function(e) {
    mapDragInProgress = false;
  });

  // Update site subscriptions when category selection changes.
  Deps.autorun(function () {
    CategoryList.categoryDependency.depend();
    MapUtilities.updateSiteSubscription();
  });

  Deps.autorun(function() {
    // Stop watching location when user goes away from the main map view
    if (!Session.equals('currentPrimaryView', false)) {
      LocateWatch.stop();
    }

    var editor = null;
    var messages = {
      place: {
        verifyEmail: {
          add: i18n.t('site.verifyEmailToAddPlace'),
          edit: i18n.t('site.verifyEmailToEditPlace')
        },
        logIn: {
          add: i18n.t('site.logInToAddPlace', {url: '/login'}),
          edit: i18n.t('site.logInToEditPlace', {url: '/login'})
        }
      },
      route: {
        verifyEmail: {
          add: i18n.t('site.verifyEmailToAddRoute'),
          edit: i18n.t('site.verifyEmailToEditRoute')
        },
        logIn: {
          add: i18n.t('site.logInToAddRoute', {url: '/login'}),
          edit: i18n.t('site.logInToEditRoute', {url: '/login'})
        }
      }
    };

    var type = null;
    if (Session.equals('currentPrimaryView', 'editPlace')) {
      type = 'place';
      editor = placeEditor;
    } else if (Session.equals('currentPrimaryView', 'editRoute')) {
      type = 'route';
      editor = routeEditor;
    }
    if (!type) return;

    function exitEditModeAndNotifyUser(messageContainer) {
      if (editor.editModeOn) {
        editor.exitEditMode();
      }
      if (Session.get('siteDetailsId')) {
        ViewMessage.show(messageContainer.edit);
      } else {
        ViewMessage.show(messageContainer.add);
      }
    }

    if (Meteor.userId()) {
      if (UserService.isEmailVerified(Meteor.userId())) {
        editor.startAdd();
        ViewMessage.hide({soft: true});
      } else {
        exitEditModeAndNotifyUser(messages[type].verifyEmail);
      }
    } else {
      exitEditModeAndNotifyUser(messages[type].logIn);
    }
  });

  // Positions the active site on map when the page is initially loaded.
  Deps.autorun(function (computation) {
    if (Session.get('siteDetailsId')) {
      var site = Sites.findOne({_id: Session.get('siteDetailsId')});
      if (site) {
        Session.set('mapPositionSiteId', site._id);
        computation.stop();
      }
    } else {
      computation.stop();
    }
  });

  $(document).on('click', '.undo-delete-site-link', function(e) {
    e.preventDefault();
    var siteId = $(e.target).attr('data-id');
    if (!siteId) {
      return;
    }

    var callback = function(error, success) {
      if (error || !success) {
        ViewMessage.show(i18n.t('site.restoreSiteFailure', {
          url: '/deleted-sites'
        }), {timeout: 5000, type: 'error'});
      } else {
        ViewMessage.show(i18n.t('site.restoreSiteSuccess'), {timeout: 5000});
      }
    };

    Meteor.call('restoreLatestSiteRevision', siteId, callback);
  });

  /* Updates map positioning to the site whenever mapPositionSiteId is changed.
   * The map is panned and zoomed so that the site is centered in the
   * available space above the open detail view panel. */
  Deps.autorun(function () {
    var id = Session.get('mapPositionSiteId');
    if (id && MapUtilities.positionSiteOnMap(Sites.findOne(id))) {
      Session.set('mapPositionSiteId', '');
    }
  });

  function onClick(e) {
    if (Session.get('closeTabsOnMapClick')) {
      Template.topView.closeSearch();

      // Close all open views if topview.closeSearch didn't close them.
      if (Session.get('currentPrimaryView'))
        pagejs('/');
    }
  }

  // Show banned message on initial page load if the user is banned.
  Deps.autorun(function() {
    if (Subscriptions.essentialsReady()) {
      Utilities.showUserIsBannedMessage();
      Deps.currentComputation.stop();
    }
  });
};

LocateWatch = (function() {
  var LocateWatch = {};
  var eventHandlersSet = false;

  LocateWatch.watchingLocation = false;
  /* This is used to track if location has been found at least once after
   * watching started. */
  LocateWatch.locationFoundOnce = false;

  // Contains the most recent user location. L.LatLng object.
  LocateWatch.userLocation = undefined;

  function locateSuccess(locationEvent) {
    LocateWatch.locationFoundOnce = true;
    LocateWatch.userLocation = locationEvent.latlng;

    if (userLocMarker) {
      userLocMarker.setLatLng(locationEvent.latlng);
    } else {
      userLocMarker = L.marker(locationEvent.latlng,
        {icon: L.icon(MarkerIconOptions.userLocation), clickable: false});
      userLocMarker.addTo(map);
      /* Bring marker to front. Only selected place marker is
       * placed on top of user location marker. */
      userLocMarker.setZIndexOffset(5000);
    }

    if (userLocCircle) {
      userLocCircle.setLatLng(locationEvent.latlng);
      userLocCircle.setRadius(locationEvent.accuracy);
    } else {
      userLocCircle = L.circle(locationEvent.latlng, locationEvent.accuracy,
        {color: '#7fbf49', weight: 3, clickable: false});
      userLocCircle.addTo(map);
    }

    map.setView(locationEvent.latlng, map.getZoom());
  }

  function locateFail(e) {
    /* If location hasn't been successfully found even once after the user
     * clicked the button to start locating, give up and reset the button
     * state. This is to reset the button state if the browser for example
     * denies the location access. */
    if (!LocateWatch.locationFoundOnce) {
      ViewMessage.show(i18n.t('map.locateFailed'), {timeout: 5000, type: 'error'});
      LocateWatch.stop();
    }
  }

  LocateWatch.start = function() {
    pagejs('/');
    this.locationFoundOnce = false;
    if (!eventHandlersSet) {
      map.on('locationfound', locateSuccess);
      map.on('locationerror', locateFail);
      eventHandlersSet = true;
    }
    map.locate({
      watch: true,
      timeout: 15000
    });
    this.watchingLocation = true;

    $('#locate-button').addClass('active');
    $('#locate-button').attr('title', i18n.t('map.stopLocateTooltip'));
  };

  LocateWatch.stop = function() {
    try {
      map.stopLocate();
      $('#locate-button').removeClass('active');
      $('#locate-button').attr('title', i18n.t('map.startLocateTooltip'));
      this.watchingLocation = false;
    }
    catch (exception) {
      console.log('Stopping locate watch failed: ' + exception);
    }
  };

  return LocateWatch;
}());

Template.lowerLeftToolbar.events({
  'click #locate-button': function() {
    if (!LocateWatch.watchingLocation) {
      LocateWatch.start();
    } else {
      LocateWatch.stop();
    }
  }
});

MapUtilities = {
  /* Returns coordinates in Leaflet's L.LatLng type */
  geoJsonPointToLatLng: function(geoJSON) {
    /* L.LatLng wants latitude first and longitude second,
     * but in GeoJSON'n format longitude is first. */
    return new L.LatLng(geoJSON.coordinates[1], geoJSON.coordinates[0]);
  },

  /**
   * Positions site on available screen space by using positionAreaOnMap and
   * positionPointOnMap functions. Does nothing if no parameters are given.
   * @param  {Object} siteObject In same format as Sites collection entries.
   * @return {Boolean} true if positioning was attempted, false otherwise.
   */
  positionSiteOnMap: function(siteObject) {
    if (siteObject && siteObject.area) {
      var coordinates = siteObject.area.coordinates[0];
      var southWest = new L.LatLng(coordinates[3][1], coordinates[3][0]);
      var northEast = new L.LatLng(coordinates[1][1], coordinates[1][0]);
      var areaBounds = new L.LatLngBounds(southWest, northEast);
      MapUtilities.positionAreaOnMap(areaBounds);
      return true;
    } else if (siteObject && siteObject.location) {
      MapUtilities.positionPointOnMap(
        MapUtilities.geoJsonPointToLatLng(siteObject.location));
      return true;
    } else {
      return false;
    }
  },

  /**
   * Centers and zooms the map to fit given area on available screen space.
   * @param  {Object} areaBounds Leaflet LatLngBounds object.
   */
  positionAreaOnMap: function (areaBounds) {
    if (!areaBounds.isValid()) return false;

    this.disableSiteSubscriptionUpdate();

    var areaCenter = areaBounds.getCenter();
    var limits = _getAvailableScreenSpaceLimits();
    areaBounds = areaBounds.pad(0.05);

    /* These limits extend the area so that it can be centered and zoomed
     * to fit the site in assigned place on screen. */
    var northEastLimit = areaBounds.getNorthEast();
    var southWestLimit = areaBounds.getSouthWest();

    var areaWidth = areaBounds.getEast() - areaBounds.getWest();
    var areaHeight = areaBounds.getNorth() - areaBounds.getSouth();

    northEastLimit.lat = northEastLimit.lat + (areaHeight * limits.top /
                                               (limits.bottom - limits.top));
    northEastLimit.lng = northEastLimit.lng + (areaWidth * limits.left /
                                               (limits.right - limits.left));

    southWestLimit.lat = southWestLimit.lat -
      (areaHeight * (1 - limits.bottom) / (limits.bottom - limits.top));
    southWestLimit.lng = southWestLimit.lng -
      (areaWidth * (1 - limits.right) / (limits.right - limits.left));

    areaBounds.extend(southWestLimit);
    areaBounds.extend(northEastLimit);

    /* Move map to correct zoom level immediately. Position will be
     * slightly off due to automatic padding from Leaflet zoom. */
    map.setView(areaBounds.getCenter(),
                map.getBoundsZoom(areaBounds),
                {animate: false});

    // Calculate the final map position
    var mapBounds = map.getBounds();
    var mapWidth = mapBounds.getEast() - mapBounds.getWest();
    var mapHeight = mapBounds.getNorth() - mapBounds.getSouth();
    /* Current LatLng coordinates on the screen position
     * where the site should be centered. */
    var siteTarget = L.latLng(
      mapBounds.getNorth() - mapHeight * (limits.top + limits.bottom)/2,
      mapBounds.getEast() - mapWidth * (1 - (limits.left + limits.right)/2)
    );
    var siteTargetOffset = L.latLng(siteTarget.lat - areaCenter.lat,
                                    siteTarget.lng - areaCenter.lng);
    var mapCenter = map.getCenter();
    var newCenter = new L.LatLng(mapCenter.lat - siteTargetOffset.lat,
                                 mapCenter.lng - siteTargetOffset.lng);
    // Center map so that the area is in correct position
    map.panTo(newCenter, {animate: false});

    this.enableSiteSubscriptionUpdate();
  },

  /**
   * Centers and zooms the map to fit given point on available screen space.
   * @param  {Object} latLngPoint Leaflet LatLng object
   */
  positionPointOnMap: function (latLngPoint) {
    this.disableSiteSubscriptionUpdate();

    var limits = _getAvailableScreenSpaceLimits();
    var containerSize = map.getSize();
    /* Vertical offset is slightly less than the actual center to make
     * the place marker placement look better. */
    var centerOffset = [
      containerSize.x * (0.5 - ((limits.right - limits.left)/2 + limits.left)),
      containerSize.y * (0.5 - ((limits.bottom - limits.top)/1.5 + limits.top))
    ];

    var containerCoords = map.latLngToContainerPoint(latLngPoint);

    containerCoords.x += centerOffset[0];
    containerCoords.y += centerOffset[1];

    var centerCoords = map.containerPointToLatLng(containerCoords);

    // Center the map immediately to correct location, then zoom.
    map.panTo(centerCoords, {animate: false});
    map.setZoomAround(latLngPoint, 17);

    this.enableSiteSubscriptionUpdate();
  },

  disableSiteSubscriptionUpdate: function() {
    this.siteSubscriptionUpdateDisabled = true;
  },

  enableSiteSubscriptionUpdate: function() {
    this.siteSubscriptionUpdateDisabled = false;
    this.updateSiteSubscription();
  },

  updateSiteSubscription: _.throttle(function() {
    if (this.siteSubscriptionUpdateDisabled) return;

    // Don't update the subscription if zoom level is too low
    // Rationale: Sites aren't shown on low zoom levels
    if (!placeOverlay.shouldBeShownOnMap()) return;

    var bounds = map.getBounds();
    var nw = bounds.getNorthWest();
    var ne = bounds.getNorthEast();
    var se = bounds.getSouthEast();
    var sw = bounds.getSouthWest();
    /* Get a subscription of a bit bigger area than what's currently visible.
     * Even though degrees of latitude and longitude don't have a linear
     * relation to distance in metres, I guess it's not worthwhile to calculate
     * the needed degree offset given some wanted distance in metres.
     */
    var zoomLevel = map.getZoom();
    var offset;
    if (zoomLevel >= 16) {
      offset = 0.001;
    } else if (zoomLevel >= 14) {
      offset = 0.05;
    } else if (zoomLevel >= 12) {
      offset = 0.2;
    } else {
      offset = 0.3;
    }
    nw = [nw.lng-offset, nw.lat+offset];
    ne = [ne.lng+offset, ne.lat+offset];
    se = [se.lng+offset, se.lat-offset];
    sw = [sw.lng-offset, sw.lat-offset];
    var geoJson = {
      type: 'Polygon',
      coordinates: [[nw, ne, se, sw, nw]]
    };

    /* Using the actual array instead of a copy would cause problems with the
     * subscriptions. This is probably because then each subscriptions (current
     * and old) would have a reference to same category object stored in their
     * internal variables (this is just a guess).*/
    var categories = _.clone(CategoryList.selectedCategories);

    var oldPlaceSubscription = placeSubscription;
    placeSubscription = Meteor.subscribe('places', geoJson, categories);
    if (oldPlaceSubscription) {
      oldPlaceSubscription.stop();
    }

    var oldRouteSubscription = routeSubscription;
    routeSubscription = Meteor.subscribe('routes', geoJson, categories);
    if (oldRouteSubscription) {
      oldRouteSubscription.stop();
    }

    SiteLoadSpinner.spin();
  }, 500, {leading: false})
};

(function(global) {
  var SiteLoadSpinner = (function() {

  var stopSpinnerComputation = null;
  var spinner = null;
  var spinnerTimer = null;
  var SPIN_DELAY = 300;

    return {
      init: function() {
        spinner = Utilities.createSpinner(null, {
          size: 11,
          color:'#fff',
          dontStart: true
        });
      },
      spin: function() {
        /* Start spinning only if the subscriptions don't become ready before
         * SPIN_DELAY has passed. This prevents flicker that would otherwise
         * occur from the spinner being quickly shown and hidden again and
         * again while panning the map. */
        if (spinnerTimer) clearTimeout(spinnerTimer);
        spinnerTimer = _.delay(function() {
          $('#site-load-spinner').show();
          spinner.spin($('#site-load-spinner')[0]);
        }, SPIN_DELAY);

        // Stop spinning when both site subscriptions become ready
        if (stopSpinnerComputation) stopSpinnerComputation.stop();
        stopSpinnerComputation = Deps.autorun(function() {
          if ((!placeSubscription || placeSubscription.ready()) &&
              (!routeSubscription || routeSubscription.ready()) &&
              placeOverlay.ready() && routeOverlay.ready()) {
            if (spinnerTimer) {
              clearTimeout(spinnerTimer);
              spinnerTimer = null;
            }
            $('#site-load-spinner').hide();
            spinner.stop();
            Deps.currentComputation.stop();
            stopSpinnerComputation = null;
          }
        });
      }
    };
  })();

  global.SiteLoadSpinner = SiteLoadSpinner;

})(this);

/**
 * Returns the boundaries of available screen area.
 * @return {Object} Has 4 properties: top, bottom, right and left.
 *                  These represent the bondaries of available area on screen.
 *                  The values of the properties are in range [0.0, 1.0].
 *                  Origin is at top left.
 */
function _getAvailableScreenSpaceLimits() {
  var windowHeight = $(document).height();
  var searchBarHeight = 0;
  if ($('.top-view .upper').is(':visible')) {
    searchBarHeight = $('.top-view .upper').height() / windowHeight;
  }

  return {
    top: searchBarHeight,
    bottom: (windowHeight - $('.detail-view').height()) / windowHeight,
    left: 0,
    right: 1
  };
}
