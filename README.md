# SLURP (Suomen liikunta- ja ulkoilureittipalvelu)

## Requirements

The following software must be installed for the application to work properly:

  - GraphicsMagick (on Ubuntu, it can be installed by running "sudo apt-get install graphicsmagick")
  - Node.js
  - Meteor
  - Meteorite

## Quick Note About Sites

Site is the name of the data model representing either a place or a route. See models/sites.js.

## Custom versions of third party code

The page.js version has been tweaked so that it is exposed as window.pagejs instead of window.page because window.page was already in use by the Android browser.

Simplify.js has also been slightly modified.

In Moment.js there is one change in file client/js/lib/moment/fi.js, at line 48. The original form of the line is commented out.

## Setting up the development environment

The following is the recommended way:

  - Install nvm (Node Version Manager)
  - Install nodejs using nvm
  - Install Meteor
  - Install Meteorite

Up to date installation instructions for them can be found on their websites.

## Configuration

There is already a configuration for development environment in settings/settings_dev.json. For security reasons, though, it doesn't have configuration for the following:

  - Login services i.e. logging in with Facebook and Google
  - Using Amazon S3 for uploading site and comment images into.

### Login Services

Facebook login service configuration requires the following keys:

  - loginServices.facebook.appId
  - loginServices.facebook.secret

Google login service configuration requires the following keys:

  - loginServices.google.clientId
  - loginServices.google.secret

See Meteor's documentation (Meteor.loginWithFacebook and Meteor.loginWithGoogle) on how to retrieve the values for these keys. The key names (appId and secret) are the same as keys required in Meteor's Accounts.loginServiceConfiguration collections.

Here is an example configuration with real values replaced (partly) with questions marks:

    "loginServices": {
      "facebook": {
        "appId": "?????????????",
        "secret": "????????????????????????????????"
      },
      "google": {
        "clientId": "????????????.apps.googleusercontent.com",
        "secret": "????????????????????????"
      }
    }

### Amazon S3 configuration for images

Amazon S3 is used to store images that have been added to sites and comments.

Information on how to get it configured can be found elsewhere on Amazon. The configuration keys use the same names as what Amazon uses. See Amazon's documentation.

Here is again an example configuration with real values replaced (partly) with question marks:

    "AWS": {
      "accessKeyId": "????????????????????",
      "secretAccessKey": "????????????????????????????????????????",
      "region": "eu-west-1",
      "S3Bucket": "somenamehere"
    }

## Running

To run the service locally in a development environment, use scripts/run_dev.sh. The script takes care of using the correct settings. Note that the script expects the working directory to be the root of the git repository.

## Git Commit Message Guide

First line should have a brief summary of changes. If further information is needed, it should be placed after a blank line as bullet points (using character '-'). Verbs should be in instruction format, also known as imperative.

### Example:

    Fix bugs with physics component

    - Change interpolation method to verlet integration
    - Add collision detection between multiple particles

## Code Style Guide

[Google JavaScript Style Guide][1]

Additionally:

  - Line length: 80 characters
  - Indentation with 2 spaces
  - Comments on the same line, above if it doesn't fit
  - Beginning brace on the same line as the beginning statement
  - File names use dash to separate words. For example: route-overlay.js

[1]: http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml

## Internationalization

Internationalization is done using [i18next][2]. It can be used directly everywhere in client JavaScript code, and it can also be used in Handlebars templates using a helper defined in client/js/lib/i18next-glue.js. i18next can also be used in the server-side using [i18next-node][3]. It is initialized in server/i18next-init.js and exposed as a global variable called i18n.

[2]: http://i18next.com/
[3]: http://i18next.com/node/

## Adding admin users

1. Run "meteor mongo" in the project directory when meteor is running
2. In the mongo shell, run "db.users.find()" and find the user id from the listing or find the user id by email with "db.users.findOne({'emails.0.address': 'email@here.com'}).\_id"
3. Run "db.users.update({\_id: 'ID\_HERE'}, {$set: {isAdmin: true}})" to add administration rights for the user
