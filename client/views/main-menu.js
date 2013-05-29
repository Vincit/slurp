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

var visible = false;
var visibilityDependency = new Deps.Dependency();

Template.mainMenu.created = function() {
  Deps.autorun(function() {
    var view = Session.get('currentPrimaryView');
    Template.mainMenu.hide();
  });

  this.positionElement = function() {
    var width = $(window).width();
    var right = width - $('.top-view button.menu').offset().left;
    var menu = $('#main-menu');

    if (width < 670) {
      right -= 40;
      menu.children('.dropdown-arrow').css('left', '190px');
    } else {
      right -= 125;
      menu.children('.dropdown-arrow').css('left', '105px');
    }

    menu.css('right', right  + 'px');
    menu.children('ul').css('max-height', ($(window).height() - 70) + 'px');
  }
};

Template.mainMenu.rendered = function() {
  if (visible) {
    this.positionElement();
    $(window).on('resize.menu', _.throttle(this.positionElement, 250));
  } else {
    $(window).off('resize.menu');
  }
}

Template.mainMenu.events({
  'click a': function() {
    Template.mainMenu.hide();
  },
  'click button.close-button': function() {
    Template.mainMenu.hide();
  }
});

Template.mainMenu.helpers({
  isVisible: function() {
    visibilityDependency.depend();
    return visible;
  }
});

Template.mainMenu.toggle = function() {
  visible = !visible;
  visibilityDependency.changed();
};

Template.mainMenu.show = function() {
  if (visible) return;

  visible = true;
  visibilityDependency.changed();
};

Template.mainMenu.hide = function() {
  if (!visible) return;

  visible = false;
  visibilityDependency.changed();
};
