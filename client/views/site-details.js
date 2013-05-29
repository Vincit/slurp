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

Template.siteDetails.created = function() {
  this.siteSubscriptionsAutorun = Deps.autorun(function(computation) {
    // Load the comments only when the user opens the full detail view
    if (!Session.equals('detailViewState', 'peek')) {
      // Meteor automatically unsubscribes the old subscription
      Meteor.subscribe('siteComments', Session.get('siteDetailsId'));
      Meteor.subscribe('site-ratings', Session.get('siteDetailsId'));
    }
  });
};

Template.siteDetails.destroyed = function() {
  if (this.siteSubscriptionsAutorun) {
    this.siteSubscriptionsAutorun.stop();
  }
};

Template.siteDetails.helpers({
  siteIsDeleted: function() {
    return !Sites.findOne(Session.get('siteDetailsId'));
  },

  showTabs: function() {
    return Session.get('currentTabs') &&
      !Session.equals('currentContentView', 'revisionHistory') &&
      !Session.equals('currentContentView', 'revisionHistoryPreview') &&
      !Session.equals('detailViewState', 'peek') &&
      Session.equals('siteIsNew', false);
  },
  site: siteObject
});

Template.siteInfo.rendered = function() {
  Utilities.initFancybox();
  Utilities.replaceThumbnailOnError($('.picture-tile img'));
}

Template.siteInfo.helpers({
  showName: function() {
    return Session.equals('currentContentView', 'revisionHistory');
  }
});

Template.siteInfoDisplay.helpers({
  showInfoDisplay: function() {
    return !Session.get('currentContentView');
  },
  site: siteObject
});

Template.siteInfoDisplay.events({
  'click .edit-info-button': function() {
    // The this keyword refers to the site object used in with block helper
    pagejs(this.infoEditLink);
  },
  'click .edit-location-button': function() {
    pagejs(this.locationEditLink);
  },
  'click .revision-history-button': function() {
    pagejs(this.revisionHistoryLink);
  },
  'click .remove-site-button': function() {
    if (!_confirmSiteDelete()) { // If user cancelled
      return;
    }

    var site = Sites.findOne(Session.get('siteDetailsId'));
    if (!site) {
      return false;
    }

    var callback = function(error, success) {
      if (error || !success) {
        ViewMessage.show(i18n.t('site.deleteSiteFailure'),
          {timeout: 5000, type: 'error'});
      } else {
        var messageKey = 'site.deleteSiteSuccess';
        var variables = {
          classNames: 'undo-delete-site-link',
          siteId: site._id
        };
        if (site.name) {
          variables.siteName = site.name;
          messageKey = 'site.deleteSiteSuccessWithName';
        }
        ViewMessage.show(i18n.t(messageKey, variables), {timeout: 5000});
        pagejs('/');
      }
    };

    Meteor.call('deleteSite', site._id, callback);
    /* Prevent detailview event handler from handling this same event
     * so that full view won't be reopened after form submit. */
    return false;
  },
  'click .show-all-buttons': function(event, template) {
    $('.edit-actions .extended-buttons').show();
    $(event.currentTarget).hide();
  }
});

Template.siteInfoEdit.selectedPictures = [];
Template.siteInfoEdit.rendered = function() {
  /* Save to template instance so that this can be compared to the current
   * values in form elements when saving the changes. */
  this.originalSite = Sites.findOne({_id: Session.get('siteDetailsId')});

  // Display which categories are selected for this site
  if (this.originalSite) {
    var site = this.originalSite;
    $('div.category-select .category').each(function() {
      if ($.inArray($(this).attr('data-category'), site.categories) > -1) {
        $(this).addClass('active');
      }
    });
  }

  this.selectedPictures = [];
  Utilities.replaceThumbnailOnError($('.picture-tile img'));
};

Template.siteInfoEdit.helpers({
  allCategories: function() {
    return Categories.find().map(Utilities.categoryObject);
  },
  site: siteObject
});

Template.siteInfoEdit.saveInProgress = false;

Template.siteInfoEdit.events({
  'click .category': function(event) {
    $(event.currentTarget).toggleClass('active');
  },
  'click #save-site-details': function(event, template) {
    if (template.saveInProgress)
      return;
    template.saveInProgress = true;

    var waitIndicator = _getWaitIndicatorObject();
    waitIndicator.start();

    // Current state
    var name = $.trim($('#site-name-edit').val());
    var description = $.trim($('#site-description-edit').val());
    var siteId = Session.get('siteDetailsId');
    var locationPath = window.location.pathname;

    // Find selected categories
    var selectedCategories = [];
    $('.category.active').each(function() {
      selectedCategories.push($(this).attr('data-category'));
    });

    var siteId = Session.get('siteDetailsId');
    function _siteUpdate() {
      var modifier = {
        $set: {},
        $pullAll: {
          pictures: template.selectedPictures
        }
      };
      if (name !== template.originalSite.name) {
        modifier['$set'].name = name;
      }
      if (description !== template.originalSite.description) {
        modifier['$set'].description = description;
      }
      if (!_.isEqual(selectedCategories, template.originalSite.categories)) {
        modifier['$set'].categories = selectedCategories;
      }
      SiteService.update(siteId, modifier, function(success) {
        if (!Sites.findOne(siteId)) {
          ViewMessage.show(i18n.t('site.saveFailedBecauseAlreadyDeleted'),
            {timeout: 5000, type: 'error'});
          pagejs('/');
        } else if (!success) {
          ViewMessage.show(i18n.t('site.saveFailed'),
            {timeout: 5000, type: 'error'});
        } else {
          // Don't switch to general tab if the user has left this page already
          if (window.location.pathname === locationPath)
            pagejs('/site/' + siteId + '/general');
        }
        template.saveInProgress = false;
      });
    };

    function _upload(blobs) {
      Meteor.call('uploadSitePictures',
        siteId,
        blobs,
        function(err, result) {
          waitIndicator.stop();
          if (err || !result) {
            ViewMessage.show(i18n.t('site.imageUploadFailed', {
              count: blobs.length
            }), {timeout: 10000, type: 'error'});
            template.saveInProgress = false;
            return;
          }
          ViewMessage.show(i18n.t('site.imageUploadSuccess', {
            count: blobs.length
          }), {timeout: 3000});
          _siteUpdate();
          return;
        }
      );
    }

    /* Update the site immediately if there were no pictures to upload or
     * if the upload field didn't exist.
     * Otherwise wait for upload to finish. */
    try {
      if (!_loadFilesFromDisk($('#file-picker')[0], _upload)) {
        waitIndicator.stop();
        _siteUpdate();
      }
    } catch (e) {
      _handleLocalPictureLoadingError(e, waitIndicator, template);
    }
  },
  'click .file-picker-clear': function(event, template) {
    var filePickerContainer = $('.file-picker-container');
    Utilities.clearFilePicker(filePickerContainer);
    Utilities.updateFilePicker(filePickerContainer);
  },
  'change #file-picker': function(event, template) {
    Utilities.updateFilePicker($('.file-picker-container'),'site.currentPictureFile');
  },
  'click .picture-tile': function(e, t) {
    var url = this.toString();
    var existing = t.selectedPictures.indexOf(url);
    var tile = $(e.currentTarget);

    if (existing !== -1) {
      t.selectedPictures.splice(existing, 1);
      tile.toggleClass('active', false);
      tile.children('.icon-remove').hide();
    } else {
      t.selectedPictures.push(this.toString());
      tile.toggleClass('active', true);
      tile.children('.icon-remove').show();
    }
  }
});

var openedRevisionsDep = new Deps.Dependency();
var openedRevisions = [];

Template.revision.helpers({
  revisionData: function() {
    Meteor.subscribe('archiveEntryData', this.data, function() {
    });
    var siteObject = ArchivedSiteData.findOne(this.data);
    if (siteObject) {
      return getSiteDisplayInfo(siteObject);
    }
  },

  restoredFromRevision: function(originalId) {
    return i18n.t('site.restoredFromRevision', {seqNumber:
      ArchivedSites.findOne(originalId).seq });
  },

  showRevisionInfo: function() {
    if (openedRevisionsDep)
      openedRevisionsDep.depend();

    return $.inArray(this.seq, openedRevisions) !== -1;
  }
});

Template.revision.events({
  'click div.revision': function(e) {
    // Toggle revision visibility
    var index = $.inArray(this.seq, openedRevisions);
    if (index === -1) {
      openedRevisions.push(this.seq);
    } else {
      openedRevisions.splice(index, 1);
    }
    openedRevisionsDep.changed();
  },

  'click a.revision-link': function(e) {
    var container = $('div .content');
    var target = $($(e.target).attr('href'));

    container.animate({scrollTop:
      target.offset().top - container.offset().top + container.scrollTop()
    });
    return false;
  },

  'click .preview-button': function() {
    pagejs('/site/' + Session.get('siteDetailsId') + '/history/' + this._id);
  },

  'click .restore-button': function() {
    if (!_confirmRevisionRestore(this.timestamp, this.seq)) { // If user cancelled
      return false;
    }

    // 'this' is the template context
    _restoreRevision(this);

    return false;
  }
});

Template.siteHistory.rendered = function() {
  if (!Session.equals('currentContentView', 'revisionHistory')) {
    openedRevisions.length = 0;
  }
};

Template.siteHistory.helpers({
  revisions: function() {
    var currentSite = Session.get('siteDetailsId');
    Meteor.subscribe('siteArchiveEntries', currentSite);
    return ArchivedSites.find({site: currentSite}, {sort: {timestamp: -1}});
  },

  loginPrompt: function() {
    return i18n.t('site.loginToBrowseRevisionHistory', {url: '/login'});
  },
  verifyEmailPrompt: function() {
    return i18n.t('site.verifyEmailToBrowseRevisionHistory');
  },

  site: siteObject
});

Template.siteHistory.events({
  'click .back-button': function() {
    var siteId = Session.get('siteDetailsId');
    if (Sites.findOne(siteId)) {
      pagejs('/site/' + siteId + '/general');
    } else {
      pagejs('/deleted-sites');
    }
  }
});

Template.siteHistoryPreview.rendered = function() {
  if (Session.equals('currentContentView', 'revisionHistoryPreview')) {
    var current = $('.route-color-legend.current-site-legend-link');
    if (current)
      current.css('background-color', PolylineOptions.highlightColor);

    var revision = $('.route-color-legend.revision-site-legend-link');
    if (revision)
      revision.css('background-color', PolylineOptions.previewColor);
  }
};

Template.siteHistoryPreview.helpers({
  currentVersionExists: function() {
    return Sites.findOne(Session.get('siteDetailsId'));
  },

  siteIsRoute: function() {
    var archiveEntry = ArchivedSites.findOne(Session.get('revisionId'));
    if (archiveEntry && archiveEntry.data) {
      var data = ArchivedSiteData.findOne(archiveEntry.data);
      return data ? Boolean(data.routeData) : false;
    }
  },

  revision: function() {
    return ArchivedSites.findOne(Session.get('revisionId'));
  }
});

Template.siteHistoryPreview.events({
  'click .back-button': function() {
    pagejs('/site/' + Session.get('siteDetailsId') + '/history');
  },

  'click .current-site-legend-link': function() {
    MapUtilities.positionSiteOnMap(Sites.findOne(Session.get('siteDetailsId')));
  },

  'click .revision-site-legend-link': function() {
    var revision = ArchivedSites.findOne(Session.get('revisionId'));
    if (revision) {
      MapUtilities.positionSiteOnMap(ArchivedSiteData.findOne(revision.data));
    }
  },

  'click .restore-button': function() {
    var revision = ArchivedSites.findOne(Session.get('revisionId'));
    if (revision && _confirmRevisionRestore(revision.timestamp, revision.seq)) {
      _restoreRevision(revision);
    }
  }
});

Template.siteDetailsComments.created = function() {
  this.commentFormOpen = false;
  this._showCommentForm = function() {
    $('.comment-section .show-comment-form').hide();
    $('div.new-comment').show();
    this.commentFormOpen = true;
  };
  this._hideCommentForm = function() {
    $('.comment-section .new-comment').hide();
    $('.comment-section .new-comment .comment-text').val('');
    $('.comment-section .show-comment-form').show();
    this.commentFormOpen = false;
  };
};

Template.siteDetailsComments.rendered = function() {
  Utilities.initFancybox();

  if (this.commentFormOpen) {
    this._showCommentForm();
  } else {
    this._hideCommentForm();
  }
  Utilities.replaceThumbnailOnError($('.picture-tile img'));
};
Template.siteDetailsComments.saveInProgress = false;

Template.siteDetailsComments.events({
  'click button.show-comment-form': function(event, template) {
    template._showCommentForm();
  },
  'click button.send-comment': function(event, template) {
    if (template.saveInProgress)
      return;
    template.saveInProgress = true;

    var waitIndicator = _getWaitIndicatorObject();
    waitIndicator.start();

    var author = Meteor.userId();
    var text = $.trim($('.new-comment .comment-text').val());
    var siteId = Session.get('siteDetailsId');
    var pictureUrl = null;
    var fileInputJQ = $('#file-picker');

    if (!author || text.length <= 0) {
      if (text.length <= 0) {
        ViewMessage.show(i18n.t('site.commentTextRequired'),
          {timeout: 10000, type: 'error'});
      }
      waitIndicator.stop();
      template.saveInProgress = false;
      return false;
    }

    function _upload(blobs) {
      Meteor.call('uploadCommentPicture',
        blobs,
        function(err, result) {
          if (err || !result) {
            console.log(err);
            ViewMessage.show(i18n.t('site.imageUploadFailed'),
              {timeout: 10000, type: 'error'});
            waitIndicator.stop();
            template.saveInProgress = false;
            return;
          }
          ViewMessage.show(i18n.t('site.imageUploadSuccess'),
            {timeout: 5000});
          _commentSave(result);
          return;
        }
      );
    }

    function _commentSave(pictureUrls) {
      var commentData = {
        author: author,
        text: text,
        site: siteId,
        dateTime: new Date()
      };
      if (pictureUrls) {
        commentData.picture = pictureUrls[0];
      }

      Meteor.call('insertComment', commentData, function(error, result) {
        if (error || !result) {
          ViewMessage.show(i18n.t('comments.commentAddFailed'),
              {timeout: 10000, type: 'error'});
        } else {
          $('.comment-section .new-comment').hide();
          $('.comment-section .new-comment .comment-text').val('');
          $('.comment-section .show-comment-form').show();
        }
      });
      waitIndicator.stop();
      template.saveInProgress = false;
      if (fileInputJQ) {
        /* Clear the input file input field so that the user doesn't accidentally
           upload the same file again */
        fileInputJQ.val('');
      }
      template._hideCommentForm();
    }

    try {
      if (!fileInputJQ || !_loadFilesFromDisk(fileInputJQ[0], _upload)) {
        _commentSave();
      }
    } catch (e) {
      _handleLocalPictureLoadingError(e, waitIndicator, template);
    }
  },

  'click .file-picker-clear': function(event, template) {
    var filePickerContainer = $('.file-picker-container');
    Utilities.clearFilePicker(filePickerContainer);
    Utilities.updateFilePicker(filePickerContainer);
  },
  'change #file-picker': function(event, template) {
    Utilities.updateFilePicker($('.file-picker-container'), 'site.currentPictureFile');
  },
  'click .remove-comment': function() {
    if (window.confirm(i18n.t('comments.confirmCommentRemoval',
        {text: Utilities.textExcerpt(this.text, 50)}))) {
      Meteor.call('deleteComment', this._id);
    }

    return false;
  }
});

Template.siteDetailsComments.helpers({
  userIsAuthor: function() {
    return this.author && Meteor.userId() === this.author;
  },
  showComments: function() {
    return Comments.find({site: Session.get('siteDetailsId')}).count() > 0;
  },
  comments: function() {
    var currentSite = Session.get('siteDetailsId');
    return Comments.find({site: currentSite}, {sort: {dateTime: -1}});
  },
  commentHeader: function() {
    return {name: Utilities.getUserName(this.author),
      emailHash: Utilities.getUserEmailHash(this.author),
      rightText: Utilities.getShortDate(this.dateTime)};
  }
});

Template.siteDetailsComments.preserve(['textarea.comment-text']);

Template.siteDetailsPictures.rendered = function() {
  Utilities.replaceThumbnailOnError($('.picture-tile img'));
};

Template.siteDetailsPictures.helpers({
  pictures: function() {
    var siteId = Session.get('siteDetailsId');
    var site = Sites.findOne(siteId);
    var comments = Comments.find({site: siteId, picture: {$exists: true}}, {sort: {dateTime: -1}}).fetch();

    Utilities.initFancybox();

    var currentSitePictures = [];

    if (site) {
      if (site.pictures)
        currentSitePictures = site.pictures;

      if (comments) {
        _.each(comments, function(e, i, l) {
          currentSitePictures.push(e.picture);
        });
      }
    }

    return currentSitePictures;
  }
});

Template.siteRating.helpers({
  showRatingText: function() {
    return !Meteor.userId() || this.userRating;
  },
  ratingsAvailable: function() {
    return this.rating >= 0;
  },
  ratingPercentage: function() {
    return (this.rating * 100).toFixed();
  },
  positiveWidth: function() {
    return this.rating * 98;
  },
  negativeWidth: function() {
    return (1 - this.rating) * 98;
  },
  positiveCount: function() {
    return SiteRatings.find({siteId: Session.get('siteDetailsId'), positive: true}).count();
  },
  negativeCount: function() {
    return SiteRatings.find({siteId: Session.get('siteDetailsId'), positive: false}).count();
  },
  userRatingIsPositive: function() {
    return this.userRating && this.userRating.positive === true;
  },
  userRatingIsNegative: function() {
    return this.userRating && this.userRating.positive === false;
  }
});

Template.siteRating.events({
  'click .rate-action button': function(event) {
    var positiveButton = $(event.target).hasClass('thumbs-up');

    if (this.userRating) {
      var ratingId = SiteRatings.findOne({userId: Meteor.userId(),
        siteId: this._id})._id;

      if (positiveButton === this.userRating.positive) {
        SiteRatings.remove(ratingId);
      } else {
        SiteRatings.update(ratingId, {$set: {positive: positiveButton}});
      }
    } else {
      SiteRatings.insert({userId: Meteor.userId(), siteId: this._id,
        positive: positiveButton});
    }
  },
  'click .rate-site.user-rated': function(event) {
    $(event.currentTarget).toggleClass('focus');
  }
});

function siteObject() {
  var reactive = true;
  if (Session.equals('currentContentView', 'detailsEdit')) {
    reactive = false;
  }
  var site = Sites.findOne(Session.get('siteDetailsId'), {reactive: reactive});
  if (!site && Session.equals('currentContentView', 'revisionHistory')) {
    // Get the latest archive entry for the given site
    site = ArchivedSites.findOne({site: Session.get('siteDetailsId')}, {sort: {seq: -1}});
  }

  if (site) {
    getSiteDisplayInfo(site);

    site.locationEditable = !site.importId;
    site.infoEditLink = '/site/' + site._id + '/general/edit';
    site.locationEditLink = '/site/' + site._id + '/edit';
    site.revisionHistoryLink = '/site/' + site._id + '/history';

    site.rating = getSiteRating(site._id);
    site.userRating = SiteRatings.findOne({userId: Meteor.userId(),
      siteId: site._id});

    if (site.isRoute()) {
      site.locationEditText = i18n.t('site.editRouteNodes');
      site.loginPrompt = i18n.t('site.logInToEditRoute', {url: '/login'});
      site.verifyEmailPrompt = i18n.t('site.verifyEmailToEditRoute');
    } else {
      site.locationEditText = i18n.t('site.editPlaceLocation');
      site.loginPrompt = i18n.t('site.logInToEditPlace', {url: '/login'});
      site.verifyEmailPrompt = i18n.t('site.verifyEmailToEditPlace');
    }

    if (site.importId) {
      var attributionData = {
        timestamp: moment(site.importDate).format('LL'),
        source: site.importSource,
        url: site.importUrl};

      if (site.isRoute()) {
        site.attributionHtml = i18n.t('site.importedRouteAttribution', attributionData);
      } else {
        site.attributionHtml = i18n.t('site.importedPlaceAttribution', attributionData);
      }
    }

    return site;
  } else {
    return null;
  }
}

function getSiteDisplayInfo(site) {
  site.isRoute = function() {
    return site.routeData !== undefined;
  };

  site.length = function() {
    if (site.routeLength !== undefined) {
      var kilometres = site.routeLength / 1000;
      return kilometres.toFixed(kilometres < 10 ? 1 : 0) + ' km';
    } else {
      return '';
    }
  };

  site.categories = _.map(site.categories, Utilities.categoryObject);

  return site;
}

/**
 * Get site rating
 * @param  {String} siteId The _id of the site
 * @return {Number}        A number between 0 and 1 representing the portion of
 *                         ratings on the specified site that are positive. If
 *                         no ratings have been given to this site, returns -1.
 */
function getSiteRating(siteId) {
  var positiveCount = SiteRatings.find({siteId: siteId, positive: true}).count();
  var totalCount = positiveCount + SiteRatings.find({siteId: siteId, positive:
    false}).count();

  return totalCount > 0 ? positiveCount / totalCount : -1;
}

/**
 * Shows a confirmation for deleting a place or a route.
 *
 * @return True if the user confirmed or false if the user cancelled.
 */
function _confirmSiteDelete() {
  var siteId = Session.get('siteDetailsId');
  var site = Sites.findOne({_id: siteId});
  if (!site) {
    console.log('Could not find site to delete. Id was: ' + siteId);
    return false;
  }
  var siteName = site.name;
  var messageKey;
  if (site.routeData) {
    if (siteName) {
      messageKey = 'site.routeDeleteConfirmation';
    } else {
      messageKey = 'site.routeDeleteConfirmationWithoutName';
    }
  } else {
    if (siteName) {
      messageKey = 'site.placeDeleteConfirmation';
    } else {
      messageKey = 'site.placeDeleteConfirmationWithoutName';
    }
  }
  return confirm(i18n.t(messageKey, {name: siteName}));
}

function _confirmRevisionRestore(timestamp, seqNumber) {
  if (!timestamp || !seqNumber) {
    return false;
  }

  return confirm(i18n.t('site.restoreRevisionConfirmation',
                 {timestamp: moment(timestamp).format('LLL'),
                  seqNumber: seqNumber}));
}

/**
 * Attemps to restore site revision.
 * @param  {Object} revision contains revision data. See ArchivedSites collection.
 */
function _restoreRevision(revision) {
  if (!revision || !revision._id || !revision.seq) return;

  var callback = function(error, success) {
    if (error || !success) {
      ViewMessage.show(i18n.t('site.restoreRevisionFailure', {
        seqNumber: revision.seq
      }), {timeout: 5000, type: 'error'});
    } else {
      ViewMessage.show(i18n.t('site.restoreRevisionSuccess', {
        seqNumber: revision.seq
      }), {timeout: 5000});
      pagejs('/site/' + revision.site + '/history');
    }
  };

  Meteor.call('restoreSiteRevision', revision._id, callback);
}

/**
 * @param {Element} inputElement File picker element
 * @param {Function} success Called when the operation completes successfully
 * @return True if upload was started. False otherwise.
 */
function _loadFilesFromDisk(inputElement, success) {
  if (!inputElement || !success)
    return false;

  var files = inputElement.files;
  if (!files || files.length <= 0)
    return false;

  var blobs = [];

  for (var i = 0; i < files.length; i++) {
    var fileReader = new FileReader();

    // Called when a file finishes loading to browser memory
    fileReader.onload = function(blob) {
      // If an ArrayBuffer parameter is passed to Meteor.call, the buffer
      // loses its data. Thus creating a view on it and transferring
      // the data like that. Tested with Meteor 0.6.4.
      var arrayBufferView = new Uint8Array(blob.target.result);
      blobs.push(arrayBufferView);

      // True if this was the last file that finished loading
      if (blobs.length == files.length) {
        success(blobs);
      }
    };

    fileReader.onerror = function(error) {
      throw new Meteor.Error(400, 'Local file loading failed');
    }

    if (files[i].size > Meteor.settings.public.maxFileSize)
      throw new Meteor.Error(400, 'File too large', 'validation.fileRejectedSize');

    fileReader.readAsArrayBuffer(files[i]);
  }

  return true;
}

function _handleLocalPictureLoadingError(error, waitIndicator, template) {
  console.log(error);
  if (error.details === 'validation.fileRejectedSize') {
    ViewMessage.show(i18n.t(error.details,
      {maxFileSize: Meteor.settings.public.maxFileSize / 1048576}),
      {timeout: 10000, type: 'error'});
  } else {
    ViewMessage.show(i18n.t('site.imageUploadFailed'),
      {timeout: 10000, type: 'error'});
  }
  waitIndicator.stop();
  template.saveInProgress = false;
}

function _getWaitIndicatorObject() {
  return {
    start: function() {
      $('.detail-view .content-container').append(
        '<div class="loading-overlay"></div>');

      this.spinner = Utilities.createSpinner($('.detail-view .loading-overlay'),
        {color: '#333', proportionalSize: 0.15, minSize: 60});
    },
    stop: function() {
      this.spinner.stop();
      $('.detail-view .loading-overlay').remove();
    }
  };
}
