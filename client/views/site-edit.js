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

Template.editRoute.rendered = function() {
  // Populate form if necessary
  Utilities.loadSiteDataWhenAvailable(Session.get('siteDetailsId'), 'route',
    function(currentRoute) {
      if (currentRoute) {
        if (currentRoute.name) {
          $('form.edit-route input[name="name"]').val(currentRoute.name);
        }
        if (currentRoute.description) {
          $('form.edit-route textarea[name="description"]').val(
            currentRoute.description);
        }
      }
    }
  );
  $('form.edit-route input[name="name"]').focus();
};

Template.editRoute.events({
  'click button.finish' : function(e) {
    var isNewSite = !Session.get('siteDetailsId');
    var callback = function(siteId) {
      if (siteId) {
        if (isNewSite) {
          pagejs('/site/' + siteId + '/general/edit');
        } else if (Sites.findOne({_id: siteId})) {
          pagejs('/site/' + siteId + '/general');
        } else {
          ViewMessage.show(i18n.t('site.saveFailedBecauseAlreadyDeleted'),
            {timeout: 5000, type: 'error'});
          pagejs('/');
        }
      } else {
        // Show an error message for 5 seconds
        ViewMessage.show(i18n.t('routes.savingFailed'),
          {timeout: 5000, type: 'error'});
      }
    };

    routeEditor.saveAndExitEditMode(callback);
  },
  'click button.add-point' : function(e) {
    routeEditor.addPointToSightLocation();
  },
  'click button.remove-selected' : function(e) {
    routeEditor.removeSelectedPoint(e);
  },
  'click button.cancel' : function(e) {
    if (!Session.get('siteDetailsId')) {
      pagejs('/');
    } else {
      pagejs('/site/' + Session.get('siteDetailsId') + '/general');
    }
  }
});

Template.editPlace.events({
  'click button.finish' : function(e) {
    var isNewSite = !Session.get('siteDetailsId');
    var callback = function(siteId) {
      if (siteId) {
        if (isNewSite) {
          pagejs('/site/' + siteId + '/general/edit');
        } else if (Sites.findOne({_id: siteId})){
          pagejs('/site/' + siteId + '/general');
        } else {
          ViewMessage.show(i18n.t('site.saveFailedBecauseAlreadyDeleted'),
            {timeout: 5000, type: 'error'});
          pagejs('/');
        }
      } else {
        // Show an error message for 5 seconds
        ViewMessage.show(i18n.t('places.savingFailed'),
          {timeout: 5000, type: 'error'});
      }
    }

    placeEditor.saveAndExitEditMode(callback);
  },
  'click button.cancel' : function(e) {
    if (!Session.get('siteDetailsId')) {
      pagejs('/');
    } else {
      pagejs('/site/' + Session.get('siteDetailsId') + '/general');
    }
  },
  'click button.move-place' : function(e) {
    placeEditor.updatePlaceLocation();
  }
});

Template.editPlace.rendered = function() {
  // Populate form if necessary
  Utilities.loadSiteDataWhenAvailable(Session.get('siteDetailsId'), 'place',
    function(currentPlace) {
      if (currentPlace) {
        if (currentPlace.name) {
          $('form.edit-place input[name="name"]').val(currentPlace.name);
        }
        if (currentPlace.description) {
          $('form.edit-place textarea[name="description"]').val(
            currentPlace.description);
        }
      }
    }
  );
  $('form.edit-route input[name="name"]').focus();
};

Template.importRoute.events({
  'click .import': function(e, t) {
    if (t.routeImportInProgress)
      return;
    t.routeImportInProgress = true;

    var waitIndicator = Utilities.createSpinner(
      $('.detail-view .content-container')
    );

    e.preventDefault();

    function  clearSaveInProgress() {
      t.routeImportInProgress = false;
      waitIndicator.stop();
    }
    function showError() {
      clearSaveInProgress();
      ViewMessage.show(i18n.t('routes.importFailed'), {type: 'error'});
    }

    var form = $('.file-picker-container');

    ViewMessage.hide();

    var files = form.children('#file-picker')[0].files;
    if (!files || files.length <= 0) {
      ViewMessage.show(i18n.t('routes.selectFilePrompt'),
        {type: 'error', timeout: 5000});
      clearSaveInProgress();
      return;
    }

    var file = files[0];
    var reader = new FileReader();

    reader.onload = (function() {
      return function(e) {
        try {
          var gpxXml = e.target.result;
          var coordinates = GpxService.importGpxAsGeoJsonPoints(gpxXml);

          clearSaveInProgress();

          pagejs('/add-route');

          /* The route overlay is assumed to have gone to edit mode
           * synchronously, which it should have if the user is logged in. */
          routeEditor.addPointsToRoute(coordinates);
          routeEditor.fitEditedRouteOnView();
        } catch (e) {
          console.error('Importing GPX data failed');
          showError();
          return;
        }
      };
    }(file));

    reader.onerror = (function() {
      return function(e) {
        showError();
      };
    }(file));

    reader.readAsText(file);
  },
  'click .file-picker-clear': function(event, template) {
    var filePickerContainer = $('.file-picker-container');
    Utilities.clearFilePicker(filePickerContainer);
    Utilities.updateFilePicker(filePickerContainer);
  },
  'change #file-picker': function(event, template) {
    Utilities.updateFilePicker($('.file-picker-container'), 'routes.selectedGPXFile');
  }
});

Template.importRoute.helpers({
  browserSupportsFileApi: function() {
    /* Testing only for these and not for example for window.FileList and
     * window.Blob because only these two are used. */
    return Boolean(window.File && window.FileReader);
  }
});
