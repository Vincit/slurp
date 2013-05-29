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

Template.detailView.created = function() {
  Deps.autorun(function() {
    var body = $('body');

    body.toggleClass('detail-view-full',
      Session.equals('detailViewState', 'full'));

    body.toggleClass('detail-view-open',
      !Session.equals('detailViewState', 'closed'));

    body.toggleClass('dialog-open',
      Session.equals('showDialog', true));

    body.toggleClass('edit-mode',
      Session.equals('siteEditModeOn', true));
  });
}

Template.detailView.events({
  'click .detail-view.peek' : function(e) {
    try {
      var currentTabs = Session.get('currentTabs');
      if (currentTabs) {
        pagejs(currentTabs[0].link);
      }
    } catch (exception) {
      console.log('Peek redirect failed: ' + exception);
    }
  },
  'click .detail-view .close-button, tap .detail-view .close-button': function() {
    pagejs('/');
    return false;
  }
});
