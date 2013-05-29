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

// Ensure that the "current" site is always subscribed to
var currentSubscribedSiteId = null;
var currentSubscribedSiteIdDependency = new Deps.Dependency();
var currentSiteSubscription = null;

// These are used to determine when the map should be centered on selected site.
var previousSiteId;
var previousDetailViewState;

var previousViewWasAddSiteView = false;

Meteor.startup(function() {
  pagejs.base('');
  pagejs('/', reset, frontpage);
  pagejs('/add-route', reset, addRoute);
  pagejs('/add-place', reset, addPlace);
  pagejs('/import-route', reset, importRoute);
  pagejs('/deleted-sites', reset, deletedSites);
  pagejs('/login', reset, login);
  pagejs('/logout', reset, logout);
  pagejs('/register', reset, register);
  pagejs('/verify-email/:token', reset, verifyEmail, frontpage);
  pagejs('/forgot-password', reset, forgotPassword);
  pagejs('/reset-password/:token', reset, resetPassword);
  pagejs('/profile/general', reset, profile, profileGeneral);
  pagejs('/profile/comments', reset, profile, profileComments);
  pagejs('/profile/edit', reset, profile, profileEdit);
  pagejs('/profile/change-password', reset, profile, profileChangePassword);
  pagejs('/profile/remove', reset, profile, profileRemove);
  pagejs('/site/:id/edit', reset, editSite, checkSiteId);
  pagejs('/site/:id/peek', reset, siteDetails, siteDetailsPeek, checkSiteId);
  pagejs('/site/:id/history', reset, siteDetails, siteDetailsHistory);
  pagejs('/site/:id/history/:revisionId', reset, siteDetails, siteDetailsHistoryPreview);
  pagejs('/site/:id/general', reset, siteDetails, siteDetailsGeneral, checkSiteId);
  pagejs('/site/:id/general/edit', reset, siteDetails, siteDetailsEdit, checkSiteId);
  pagejs('/site/:id/comments', reset, siteDetails, siteDetailsComments, checkSiteId);
  pagejs('/site/:id/pictures', reset, siteDetails, siteDetailsPictures, checkSiteId);
  pagejs('/search', reset, searchView);
  pagejs('/feedback', reset, feedback);
  pagejs('/admin/general', reset, admin, adminGeneral);
  pagejs('/admin/users', reset, admin, adminUsers);
  pagejs('/admin/comments', reset, admin, adminComments);
  pagejs('/info/guide', reset, info, infoGuide);
  pagejs('/info/general', reset, info, infoGeneral);
  pagejs('/top/users', reset, top, topUsers);
  pagejs('/top/sites', reset, top, topSites);
  pagejs('*', reset, notFound, frontpage);
  pagejs();

  Deps.autorun(function() {
    var siteId = Session.get('siteDetailsId');
    if (!siteId || currentSubscribedSiteId === siteId) {
      if (currentSubscribedSiteId) {
        /* Resubscribe because Meteor automatically unsubscribes when
         * a Deps.autorun computation is invalidated. */
        currentSiteSubscription = Meteor.subscribe('site', currentSubscribedSiteId);
      }
    } else {
      currentSiteSubscription = Meteor.subscribe('site', siteId);
      currentSubscribedSiteId = siteId;
      currentSubscribedSiteIdDependency.changed();
    }
  });
});

function reset(ctx, next) {
  previousSiteId = Session.get('siteDetailsId');
  previousDetailViewState = Session.get('detailViewState');
  previousViewWasAddSiteView = (Session.equals('currentPrimaryView', 'editPlace') ||
      Session.equals('currentPrimaryView', 'editRoute')) &&
      !Session.get('siteDetailsId');

  Session.set('currentPrimaryView', false);
  Session.set('currentContentView', false);
  Session.set('showDialog', false);
  Session.set('detailViewState', 'closed');
  Session.set('detailViewCurrentTab', false);
  Session.set('resetPasswordToken', undefined);
  Session.set('siteDetailsId', false);
  Session.set('revisionId', false);
  Session.set('showSearchView', false);
  Session.set('showResults', false);
  Session.set('currentTabs', undefined);
  Session.set('emailAvailable', undefined);
  Session.set('closeTabsOnMapClick', true);
  Session.set('siteEditModeOn', false);
  Session.set('siteIsNew', false);
  ViewMessage.hide({soft: true});
  next();
}

function frontpage(ctx) {
}

function editSite(ctx, next) {
  if (ctx.params.id) {
    // This is set so that we don't exit edit mode before site data is fetched
    Session.set('currentPrimaryView', 'editSiteLoad');

    /* Fetch site data when it becomes available and
     * set view to edit place/route depending on site type. */
    Deps.autorun(function (computation) {
      // In case user changes view before data is loaded.
      if (!Session.equals('currentPrimaryView', 'editSiteLoad')) {
        computation.stop();
        return;
      }

      /* Checking modelFilesLoaded is required to make this autorun reactive in
       * case Sites.js isn't loaded when this function is run. */
      if (!Session.get('modelFilesLoaded') || typeof Sites === 'undefined')
        return;

      var site = Sites.findOne({_id: ctx.params.id});
      // Make sure that site editing is allowed.
      if (site && site.importId) {
        computation.stop();
        window.setTimeout(function() { pagejs('/'); }, 0);
      } else if (site) {
        Session.set('siteDetailsId', ctx.params.id);
        Session.set('mapPositionSiteId', ctx.params.id);

        if (site.routeData) {
          Session.set('currentPrimaryView', 'editRoute');
        } else {
          Session.set('currentPrimaryView', 'editPlace');
        }

        computation.stop();
      }
    });

    watchForEditModeStateChange();
  } else {
    frontpage(ctx);
  }
  next();
}

function addRoute(ctx) {
  Session.set('currentPrimaryView', 'editRoute');
  watchForEditModeStateChange();
}

function addPlace(ctx) {
  Session.set('currentPrimaryView', 'editPlace');
  watchForEditModeStateChange();
}

// This is to make sure we only have one computation watching site edit state.
var editModeStateWatch;

/**
 * Enters the edit mode if user is logged in.
 * Exits edit mode when the view changes. */
function watchForEditModeStateChange() {
  if (editModeStateWatch) return;

  editModeStateWatch = Deps.autorun(function (computation) {
    var primaryView = Session.get('currentPrimaryView');

    if (primaryView !== 'editRoute' &&
        primaryView !== 'editSiteLoad' &&
        typeof routeEditor != 'undefined' &&
        routeEditor.editModeOn) {
      routeEditor.exitEditMode();
    }

    if (primaryView !== 'editPlace' &&
        primaryView !== 'editSiteLoad' &&
        typeof placeEditor != 'undefined' &&
        placeEditor.editModeOn) {
      placeEditor.exitEditMode();
    }

    if (primaryView !== 'editRoute' &&
        primaryView !== 'editPlace' &&
        primaryView !== 'editSiteLoad') {
      computation.stop();
      editModeStateWatch = null;
      return;
    }

    var userId = Meteor.userId();
    if (primaryView !== 'editSiteLoad' && userId &&
        UserService.isEmailVerified(userId)) {
      Session.set('closeTabsOnMapClick', false);
      Session.set('detailViewState', 'medium');
      Session.set('siteEditModeOn', true);
    }
  });
}

function importRoute(ctx) {
  Session.set('currentPrimaryView', 'importRoute');
  Deps.autorun(function() {
    if (!Session.equals('currentPrimaryView', 'importRoute')) {
      Deps.currentComputation.stop();
      return;
    }
    if (Meteor.user()) {
      if (UserService.isEmailVerified(Meteor.userId())) {
        ViewMessage.hide({soft: true});
        Session.set('detailViewState', 'medium');
      } else {
        ViewMessage.show(i18n.t('site.verifyEmailToAddRoute'));
      }
    } else {
      ViewMessage.show(i18n.t('site.logInToAddRoute', {url: '/login'}));
    }
  });
}

function deletedSites(ctx) {
  Session.set('currentPrimaryView', 'deletedSites');
  Session.set('detailViewState', 'full');
}

function login(ctx) {
  if (document.location.pathname !== '/login') {
    Session.set('loginSuccessRedirect', document.location.pathname);
  } else {
    Session.set('loginSuccessRedirect', '/');
  }
  Session.set('showDialog', true);
  Session.set('currentPrimaryView', 'login');
}

function logout(ctx) {
  Session.set('currentPrimaryView', 'logout');
  Meteor.logout(function(error) {
    if(!error) {
      ViewMessage.show(i18n.t('user.hasLoggedOut'), {timeout: 5000});
      pagejs('/');
    }
  });
}

function register(ctx) {
  Session.set('showDialog', true);
  Session.set('currentPrimaryView', 'register');
}

function verifyEmail(ctx, next) {
  Session.set('currentPrimaryView', 'verifyEmail');

  Accounts.verifyEmail(ctx.params.token, function(error) {
    if (!error) {
      ViewMessage.show(i18n.t('user.emailVerificationSucceeded'), {timeout: 5000});
    } else {
      ViewMessage.show(i18n.t('user.emailVerificationFailed'));
    }
  });

  next();
}

function forgotPassword(ctx) {
  Session.set('showDialog', true);
  Session.set('currentPrimaryView', 'forgotPassword');
}

function resetPassword(ctx) {
  Session.set('showDialog', true);
  Session.set('currentPrimaryView', 'resetPassword');
  Session.set('resetPasswordToken', ctx.params.token);
}

function profile(ctx, next) {
  Session.set('currentTabs', [
    {
      link: '/profile/general',
      identifier: 'general',
      title: i18n.t('user.generalTab')
    },
    {
      link: '/profile/comments',
      identifier: 'comments',
      title: i18n.t('user.commentsTab')
    }
  ]);

  Session.set('currentPrimaryView', 'profile');
  Session.set('detailViewState', 'full');

  next();
}

function profileGeneral(ctx) {
  Session.set('detailViewCurrentTab', 'general');
}

function profileComments(ctx) {
  Session.set('detailViewCurrentTab', 'comments');
}

function profileEdit(ctx) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('currentContentView', 'editProfile');
}

function profileChangePassword(ctx) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('currentContentView', 'changePassword');
}

function profileRemove(ctx) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('currentContentView', 'removeProfile');
}

/**
 * This function expects that the currentPrimaryView session variable has
 * already been set.
 */
function checkSiteId(ctx) {
  /* Using static function variable 'computation' to prevent multiple
   * computations from being created when currentPrimaryView doesn't change
   * when going to a different page. */
  if (checkSiteId.computation) {
    checkSiteId.computation.stop();
    checkSiteId.computation = null;
  }

  /* Using variable 'primaryView' to be able to stop the computation when
   * the current primary view changes. */
  var primaryView = Session.get('currentPrimaryView');
  checkSiteId.computation = Deps.autorun(function (computation) {
    if (!Session.equals('currentPrimaryView', primaryView)) {
      computation.stop();
      return;
    }

    currentSubscribedSiteIdDependency.depend();
    if (!Session.equals('siteDetailsId', currentSubscribedSiteId))
      return;

    if (!currentSiteSubscription || !currentSiteSubscription.ready())
      return;

    /* Checking modelFilesLoaded is required to make this autorun reactive in
     * case subscriptions.js isn't loaded when this function is run. */
    if (!Session.get('modelFilesLoaded') || typeof Sites === 'undefined')
      return;

    computation.stop();

    if (!Sites.findOne({_id: ctx.params.id})) {
      onPageNotFound();
      return;
    }
  });
}

function onPageNotFound() {
  /* Run this asynchronously because a routing operation is ongoing if this
   * code block is reached on the first run of this Deps.autorun function.
   * Starting another routing operation while one is ongoing does not work
   * as wanted. */
  setTimeout(function() {
    pagejs('/');
    notFound();
  }, 0);
}

function siteDetails(ctx, next) {
  Session.set('currentTabs', [
    {
      link: '/site/' + ctx.params.id + '/general',
      identifier: 'general',
      title: i18n.t('site.generalTab')
    },
    {
      link: '/site/' + ctx.params.id + '/comments',
      identifier: 'comments',
      title: i18n.t('site.commentsTab')
    },
    {
      link: '/site/' + ctx.params.id + '/pictures',
      identifier: 'pictures',
      title: i18n.t('site.picturesTab')
    }
  ]);

  Session.set('currentPrimaryView', 'siteDetails');
  Session.set('siteDetailsId', ctx.params.id);

  next();
}

function siteDetailsPeek(ctx, next) {
  Session.set('detailViewState', 'peek');

  next();
}

function siteDetailsHistory(ctx) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('detailViewState', 'full');
  Session.set('currentContentView', 'revisionHistory');

  positionSiteIfDirect();
}

function siteDetailsHistoryPreview(ctx) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('detailViewState', 'medium');
  Session.set('revisionId', ctx.params.revisionId);
  Session.set('currentContentView', 'revisionHistoryPreview');

  // Prevent multiple computations
  if (siteDetailsHistoryPreview.computation) {
    siteDetailsHistoryPreview.computation.stop();
    siteDetailsHistoryPreview.computation = null;
  }

  var previewVisible = false;

  // Fetch site data when it becomes available and show the revision preview.
  siteDetailsHistoryPreview.computation = Deps.autorun(function (computation) {
    // Stop the computation when user changes view.
    if (!Session.equals('currentContentView', 'revisionHistoryPreview')) {
      routeOverlay.removeSitePreview();
      placeOverlay.removeSitePreview();
      computation.stop();
      return;
    }

    /* Don't reload data if something changes in database after the preview
     * has already been shown. */
    if (previewVisible) return;

    /* Checking modelFilesLoaded is required to make this autorun reactive in
     * case site archive models haven't been loaded when this function is run. */
    if (!Session.get('modelFilesLoaded') ||
        typeof ArchivedSites === 'undefined' ||
        typeof ArchivedSiteData === 'undefined')
      return;

    Meteor.subscribe('siteArchiveEntries', ctx.params.id, function() {
      if (!ArchivedSites.findOne(ctx.params.revisionId)) {
        onPageNotFound();
      }
    });
    var revision = ArchivedSites.findOne(ctx.params.revisionId);

    if (revision) {
      Meteor.subscribe('archiveEntryData', revision.data);
      var data = ArchivedSiteData.findOne(revision.data);

      if (data) {
        if (data.routeData) {
          routeOverlay.showSitePreview(data);
        } else {
          placeOverlay.showSitePreview(data);
        }

        /* The timeout is necessary so that the templates get rerendered before
         * the site is positioned on map. */
        window.setTimeout(function() {
          MapUtilities.positionSiteOnMap(data);
        }, 0);

        previewVisible = true;
      }
    }
  });
}

function siteDetailsGeneral(ctx, next) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('detailViewState', 'full');

  positionSiteIfDirect();

  next();
}

function siteDetailsComments(ctx, next) {
  Session.set('detailViewCurrentTab', 'comments');
  Session.set('detailViewState', 'full');

  positionSiteIfDirect();

  next();
}

function siteDetailsPictures(ctx, next) {
  Session.set('detailViewCurrentTab', 'pictures');
  Session.set('detailViewState', 'full');

  positionSiteIfDirect();

  next();
}

function siteDetailsEdit(ctx, next) {
  Session.set('detailViewCurrentTab', 'general');
  Session.set('detailViewState', 'full');
  Session.set('currentContentView', 'detailsEdit');
  Session.set('closeTabsOnMapClick', false);

  if (previousViewWasAddSiteView) {
    Session.set('siteIsNew', true);
  }

  positionSiteIfDirect();

  next();
}

function positionSiteIfDirect() {
  // Center on map only when coming directly with a URL or from search results
  if (!previousSiteId) {
    Session.set('mapPositionSiteId', Session.get('siteDetailsId'));
  }
}

function searchView(ctx) {
  Session.set('currentPrimaryView', 'search');
  Session.set('showSearchView', true);
  Session.set('showResults', false);
}

function feedback(ctx) {
  Session.set('currentPrimaryView', 'feedback');
  Session.set('detailViewState', 'full');
}

function admin(ctx, next) {
  Session.set('currentPrimaryView', 'admin');
  Session.set('detailViewState', 'full');
  Session.set('currentTabs', [
    {
      link: '/admin/general',
      identifier: 'general',
      title: i18n.t('admin.generalTab')
    },
    {
      link: '/admin/users',
      identifier: 'users',
      title: i18n.t('admin.usersTab')
    },
    {
      link: '/admin/comments',
      identifier: 'comments',
      title: i18n.t('admin.commentsTab')
    }
  ]);

  if (next) {
    next();
  }
}

function adminGeneral() {
  Session.set('detailViewCurrentTab', 'general');
}

function adminUsers() {
  Session.set('detailViewCurrentTab', 'users');
}

function adminComments() {
  Session.set('detailViewCurrentTab', 'comments');
}

function notFound(ctx, next) {
  ViewMessage.show(i18n.t('validation.pageNotFound'), {type: 'error'});

  if (next) {
    next();
  }
}

function info(ctx, next) {
  Session.set('currentPrimaryView', 'info');
  Session.set('detailViewState', 'full');
  Session.set('currentTabs', [
    {
      link: '/info/guide',
      identifier: 'guide',
      title: i18n.t('info.guideTab')
    },
    {
      link: '/info/general',
      identifier: 'general',
      title: i18n.t('info.generalTab')
    }
  ]);

  if (next) {
    next();
  }
}

function infoGuide() {
  Session.set('detailViewCurrentTab', 'guide');
}

function infoGeneral() {
  Session.set('detailViewCurrentTab', 'general');
}

function top(ctx, next) {
  Session.set('currentPrimaryView', 'topLists');
  Session.set('detailViewState', 'full');
  Session.set('currentTabs', [
    {
      link: '/top/users',
      identifier: 'users',
      title: i18n.t('topLists.usersTab')
    },
    {
      link: '/top/sites',
      identifier: 'sites',
      title: i18n.t('topLists.sitesTab')
    }
  ]);

  if (next)
    next();
}

function topUsers() {
  Session.set('detailViewCurrentTab', 'users');
}

function topSites() {
  Session.set('detailViewCurrentTab', 'sites');
}
