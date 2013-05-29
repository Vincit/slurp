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

Template.adminTools.created = function() {
  // Create a global that will hold all administration search related stuff
  adminSearch = {};

  adminSearch.userDataSubscription = Meteor.subscribe('adminUserData');
  adminSearch.archiveEntriesSubscription =
    Meteor.subscribe('archiveEntrySummaries', 10);
  adminSearch.commentsSubscription = Meteor.subscribe('adminComments');
};

Template.adminTools.destroyed = function() {
  adminSearch.commentsSubscription.stop();
  adminSearch.archiveEntriesSubscription.stop();
  adminSearch.userDataSubscription.stop();

  delete adminSearch;
};

Template.adminGeneral.helpers({
  latestChanges: function() {
    return ArchivedSites.find({}, {sort: {timestamp: -1}, limit: 10}).map(
      function(doc) {
        var userName = Utilities.getUserName(doc.author).toString();

        var siteName = '';
        var site = Sites.findOne(doc.site);
        if (site) {
          siteName = site.name;
        }

        doc.link = '/site/' + doc.site + '/history';
        doc.description = i18n.t('admin.siteModifiedByUserAt',
          {author: userName, site: siteName,
          time: moment(doc.timestamp).fromNow()});

        return doc;
      }
    );
  },
  newUsers: function() {
    return Meteor.users.find({}, {sort: {createdAt: -1}, limit: 10}).map(
      function(doc) {
        doc.link = '/admin/users';
        doc.description = i18n.t('admin.userNameCreatedAt',
          {user: doc.profile.name, time: moment(doc.createdAt).fromNow()});

        return doc;
      }
    );
  }
});

Template.adminGeneral.events({
  'click .entity-list div.header': function() {
    if (this.link) {
      pagejs(this.link);
    }
  }
});

Template.adminUsers.created = function() {
  this.userSearch = new AdministrationSearch(Meteor.users, ['profile.name',
    'emails.0.address']);

  adminSearch.userDependency = new Deps.Dependency();

  // Bind searchUsers function to this template instance
  adminSearch.searchUsers = _.bind(function(text) {
    adminSearch.userResults = this.userSearch.search(text);
    adminSearch.userDependency.changed();
  }, this);


  Deps.autorun(function(computation) {
    if (adminSearch.userDataSubscription.ready()) {
      adminSearch.searchUsers('');
      computation.stop();
    }
  });
};

Template.adminUsers.rendered = function() {
  $(this.findAll('input')).placeholder();
};

Template.adminUsers.helpers({
  users: function() {
    adminSearch.userDependency.depend();
    return adminSearch.userResults;
  },
  userCreatedAt: function() {
    return i18n.t('admin.userCreatedAt',
      {time: moment(this.createdAt).format('LLL')});
  },
  userIsBanned: function() {
    return this.banHistory && _.last(this.banHistory).end > new Date();
  },
  latestBan: function() {
    return _.last(this.banHistory);
  }
});

Template.adminUsers.events({
  'click .entity-list.expandable div.header': expandContent,
  'keyup .search-input': _.debounce(function(event) {
    adminSearch.searchUsers(event.target.value);
  }, 300),
  'click .ban-user': function(event, template) {
    Session.set('currentContentView', 'banUser');
    Template.adminUsers.userToBan = this._id;
  }
});

Template.adminUsers.preserve(['.search-input']);

Template.adminBanUser.rendered = function() {
  $('#ban-form').validate({
    onsubmit: false,
    errorPlacement: function() { },
    rules: {
      'ban-user-reason': {
        required: true
      },
      'ban-user-duration': {
        required: true,
        digits: true
      }
    }
  });
};

Template.adminBanUser.helpers({
  userToBanInfo: function() {
    return i18n.t('admin.banUserInfo',
      {name: Utilities.getUserName(Template.adminUsers.userToBan),
       id: Template.adminUsers.userToBan});
  }
});

Template.adminBanUser.events({
  'submit #ban-form' : function(e, t) {
    e.preventDefault();

    if (Template.adminBanUser.banInProgress) return false;

    Template.adminBanUser.banInProgress = true;

    try {
      var form = $('#ban-form');
      function showGeneralError() {
        form.find('.ban-general-error').removeClass('hidden');
      }

      form.find('.ban-general-error').addClass('hidden');

      if (!form.valid()) {
        showGeneralError();
        Template.adminBanUser.banInProgress = false;
        return false;
      }

      var reason = $.trim($('#ban-form .ban-user-reason').val());
      var duration = form.find('input[name="ban-user-duration"]').val();
      duration = parseInt(duration, 10);
      var durationType = $('#ban-form .ban-duration-type').val();

      var endTime = new Date();

      if (durationType === 'days') {
        endTime.setDate(endTime.getDate() + duration);
      } else if (durationType === 'hours') {
        endTime.setHours(endTime.getHours() + duration);
      } else if (durationType === 'minutes') {
        endTime.setMinutes(endTime.getMinutes() + duration);
      } else {
        throw 'Unknown duration type.';
      }

      Meteor.call('banUser', Template.adminUsers.userToBan, endTime, reason,
        function(error, result) {
          if (error || !result) {
            showGeneralError();
          } else {
            pagejs('/admin/users');
            ViewMessage.show(i18n.t('admin.banUserSuccess'), {timeout: 5000});
          }
          Template.adminBanUser.banInProgress = false;
        }
      );
    } catch (tryError) {
      console.error(tryError);
      showGeneralError();
      Template.adminBanUser.banInProgress = false;
    }
  }
});

Template.adminComments.created = function() {
  this.commentSearch = new AdministrationSearch(Comments, ['author.profile.name',
    'site.name', 'text'], {'author': Meteor.users, 'site': Sites});

  adminSearch.commentDependency = new Deps.Dependency();

  // Bind searchComments function to this template instance
  adminSearch.searchComments = _.bind(function(text) {
    adminSearch.commentResults = this.commentSearch.search(text);
    adminSearch.commentDependency.changed();
  }, this);

  Deps.autorun(function() {
    if (adminSearch.commentsSubscription.ready()) {
      adminSearch.searchComments('');
      Deps.currentComputation.stop();
    }
  });
};

Template.adminComments.rendered = function() {
  $(this.findAll('input')).placeholder();
};

Template.adminComments.helpers({
  latestComments: function() {
    adminSearch.commentDependency.depend();
    return _.map(adminSearch.commentResults,
      function(doc) {
        doc.userName = Utilities.getUserName(doc.author).toString();

        var site = Sites.findOne(doc.site);
        if (site) {
          doc.siteName = site.name;
        }

        doc.shortText = doc.text ? Utilities.textExcerpt(doc.text, 70) : '';

        return doc;
      }
    );
  }
});

Template.adminComments.events({
  'click .entity-list.expandable div.header': expandContent,
  'keyup .search-input': _.debounce(function(event) {
    adminSearch.searchComments(event.target.value);
  }, 300),
  'click div.content button.remove-comment': function() {
    if (window.confirm(i18n.t('admin.confirmCommentRemoval',
        {text: this.text ? Utilities.textExcerpt(this.text, 50) : ''}))) {
      Comments.remove(this._id);
    }
  }
});

Template.adminComments.preserve(['.search-input']);

function expandContent(event) {
  var element = $(event.currentTarget);
  var icons = element.children('[class^="icon-"]');

  icons.toggleClass('icon-chevron-down');
  icons.toggleClass('icon-chevron-up');

  element.siblings('div.content').toggleClass('hidden');
  element.toggleClass('open');
}
