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

CategoryList = (function() {
  "use strict";

  var object = {
    categoryDependency: new Deps.Dependency(),
    /* The categories are set from the category list template in search view
     * using the toggleCategories function. */
    selectedCategories: [],

    resetCategories: function () {
      if (this.selectedCategories.length > 0) {
        this.selectedCategories.length = 0;
        this.categoryDependency.changed();
      }
    },
    /**
     * Toggles selected categories for the search
     * @param  {String} category The category key to toggle in the selected
     *                           categories list
     * @param  {Boolean} [sw]    If provided, it defines if the category should
     *                           be contained in the selected categories list.
     *                           If it isn't provided, presence of the category
     *                           in the list will be switched to the opposite of
     *                           the current state.
     */
    toggleCategory: function (category, sw) {
      var index = $.inArray(category, this.selectedCategories);

      if ((sw === undefined && index < 0) || (sw === true && index < 0)) {
        this.selectedCategories.push(category);
      } else if ((sw === undefined && index >= 0) || (sw === false && index >= 0)) {
        this.selectedCategories.splice(index, 1);
      }

      this.categoryDependency.changed();
    }
  };

  return object;
}());
