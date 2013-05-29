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

var siteSearch;
var searchInput;

Template.topView.events({
  'focus .input-box input': function (event) {
    /* HACK: This fixes a problem with (at least some) WebKit/Blink browsers.
     * For some reason the search field gains focus if the mouse pointer
     * hovers over the search field when dragging the map. This does not happen
     * with for example Firefox 22 or Opera 12.16. Happens with
     * Chromium 28.0.1500.52. */
    if (mapDragInProgress) {
      event.target.blur();
      return;
    }

    if (Session.equals('showSearchView', false)) {
      pagejs('/search');

      if (searchInput.val().length > 0) {
        Session.set('showResults', true);
      }
    }
  },
  'keyup .input-box input': function (event) {
    if (searchInput.val().length > 0) {
      Session.set('showResults', true);
    } else {
      Session.set('showResults', false);
      /* This is to make sure that old search results won't be shown for
       * a fraction of a second when showing the results again later. */
      siteSearch.searchResults.length = 0;
    }
  },
  'click .cancel': function (event) {
    Template.topView.closeSearch(true);
    $(event.target).hide();
  },
  'click .menu' : function(e) {
    Template.mainMenu.toggle();
  }
});

Template.topView.created = function() {
  // Change category icons whenever CategoryList changes
  Deps.autorun(function() {
    CategoryList.categoryDependency.depend();

    var categoriesElement = $('.top-view .category-filter');
    categoriesElement.children().remove('.category');

    _.each(CategoryList.selectedCategories, function(element, index, list) {
      categoriesElement.append(
        '<div class="category ' + element + '"></div>');
    });
  });

  this.resizeElements = function() {
    $('.top-view .search-view').css('max-height', ($(window).height() - 60) + 'px');
  }

  // Listen for window resize events
  $(window).on('resize.topView', _.throttle(this.resizeElements, 250));
}

Template.topView.rendered = function () {
  if (!searchInput) { // Run only once
    searchInput = $('.top-view .input-box input');
    siteSearch = new SiteSearch(searchInput);

    $(document).on('escpress', function() {
      Template.topView.closeSearch();
    });

    Deps.autorun(function () {
      searchInput.toggleClass('flat-bottom',
        Session.equals('showSearchView', true));
    });

    // Show or hide the cancel button
    Deps.autorun(function() {
      CategoryList.categoryDependency.depend();

      if (CategoryList.selectedCategories.length > 0 ||
          Session.equals('showSearchView', true) ||
          searchInput.val().length > 0) {
        $('.top-view .cancel').show();
      } else {
        $('.top-view .cancel').hide();
      }
    });

    $(this.findAll('input')).placeholder();
  }

  // Always set max-height for .search-listing and .category-select elements
  this.resizeElements();
};

Template.topView.destroyed = function() {
  $(window).off('resize.topView');
}

Template.topView.closeSearch = function(resetCategories) {
  /* For some reason using jQuery's blur() caused problems with Internet
   * Explorer 8 and 9, but this works fine. The problem was that using
   * jQuery.placeholder the placeholder text appeared as normal text. */
  searchInput[0].blur();
  searchInput.val('');

  if (resetCategories) {
    CategoryList.resetCategories();
  }

  if (Session.equals('showSearchView', true)) {
    pagejs('/');
  }
}

Template.searchListing.created = function() {
  this.spinner = Utilities.createSpinner(null, {size: 15, color: '#666',
    dontStart: true});
}

Template.searchListing.rendered = function() {
  if (!siteSearch.idle) {
    this.spinner.spin($('.search-view')[0]);
  } else {
    this.spinner.stop();
  }
}

Template.searchListing.events({
  'click li': function (event) {
    // this refers to the current mongo document used in Handlebars #each helper
    pagejs('/site/' + this._id + '/general');

    _.defer(MapUtilities.positionSiteOnMap, this);
  }
});

Template.searchListing.helpers({
  listingEntries: function () {
    siteSearch.searchDependency.depend();
    return siteSearch.searchResults;
  },
  searchResultsAreAvailable: function () {
    siteSearch.searchDependency.depend();
    return siteSearch.searchResults.length > 0;
  },
  categories: function () {
    return _.map(this.categories, Utilities.categoryObject);
  },
  noResults: function() {
    siteSearch.searchDependency.depend();
    return siteSearch.searchResults.length == 0 && siteSearch.idle;
  },
  extraInfoElement: function() {
    if (this.distance || this.rating !== undefined) {
      var result = '<span class="extra-info">';

      if (this.distance) {
        result += i18n.t('search.distanceFromCurrentLocation', {distance:
          this.distance.toFixed(this.distance > 10 ? 0 : 1)});
      }
      if (this.rating !== undefined) {
        if (this.distance) {
          result += ', ' + i18n.t('search.siteRating', {rating:
            (this.rating * 100).toFixed()});
        } else {
          result += i18n.t('search.siteRating', {rating:
            (this.rating * 100).toFixed()}).capitalize();
        }
      }

      return result + '</span>';
    } else {
      return '';
    }
  }
});

Template.categoryList.rendered = function() {
  _.each(CategoryList.selectedCategories, function (item, index) {
    $('.category-select .category[data-category="' + item + '"]'
      ).addClass('active');
  });
};

Template.categoryList.events({
  'click .category': function (event) {
    var element = $(event.currentTarget);
    element.toggleClass('active');

    CategoryList.toggleCategory(element.attr('data-category'),
      element.hasClass('active'));

    searchInput.focus(); // Prevent input from losing focus
  }
});

Template.categoryList.helpers({
  categories: function () {
    var listedCategories = Categories.find().fetch();
    listedCategories.push('other');
    return _.map(listedCategories, Utilities.categoryObject);
  }
});

Template.viewMessageContainer.rendered = function() {
  /* Show the message if something had tried to show a message when the template
   * hadn't yet been rendered. */
  if (ViewMessage.lastMessage) {
    ViewMessage.show(ViewMessage.lastMessage, ViewMessage.lastOptions);
  }
};

Template.viewMessageContainer.events({
  'click .close-button' : function() {
    ViewMessage.hide();
  }
});
