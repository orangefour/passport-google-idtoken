# passport-google-idtoken
An npm Passport Strategy that uses a Google id_token and validates against Google's tokeninfo endpoint.

### Status
[![Build Status](https://travis-ci.org/AgencyPMG/passport-google-idtoken.svg?branch=master)](https://travis-ci.org/AgencyPMG/passport-google-idtoken)
[![Coverage Status](https://coveralls.io/repos/github/AgencyPMG/passport-google-idtoken/badge.svg?branch=master)](https://coveralls.io/github/AgencyPMG/passport-google-idtoken?branch=master)

### Install
```bash
$ npm install passport-google-idtoken --save
```

### Usage
The following shows a simple example as to how to use the strategy. All that needs
to be done in the client code is implement the finding and returning of the user
with the given information in `profile`.

#### Configure the Strategy
```node
var GoogleIdTokenStrategy = require('passport-google-idtoken');
var passport = require('passport');

passport.use(
    new GoogleIdTokenStrategy(

        {}, //use the default configuration. this should be perfectly usable.

        //this is the function that verifies the found profile.
        //see below for specifics on the parameters.
        function(profile, callback) {

            //validate profile.aud.
            //validate profile.hd if it is there and you want to.

            //find the user with profile.email.
            //var user = find the user somehow.

            //if could not find user, then callback('could not find user error');

            //otherwise callback(null, user);
        }
    )
);
```

#### Authenticate Requests
```node
app.post('/auth/google', function(req, res) {
    //The req must have a req.body or req.query field with the name as that
    //supplied to new GoogleIdTokenStrategy.
    //default is 'id_token'.

    return passport.authenticate('google-idtoken')(req, res, _.bind(function(error) {
        if (error) {
            //error handling.
            return;
        }
        //success handling.
    }, this));
});
```

#### Frontend Example
Please see here for the Google documentation on using the new Google Sign In button:
https://developers.google.com/identity/sign-in/web/sign-in

Following is a simple example to render the sign in button and listen for user changes
in the browser.
```js
$(document).ready(function() {
    window.gapi.load('auth2', function() {
        var googleAuth = window.gapi.auth2.init();
        googleAuth.currentUser.listen(function(googleUser) {
            if (!googleUser.isSignedIn()) {
                return;
            }

            //optional check here to see if the button has been clicked.
            //the user will be signed in automatically and this function will be
            //called by the Google library unless you have forced a sign out.

            $.ajax({
                type: 'POST',
                url: '/auth/google?id_token=' + googleUser.getAuthResponse(),
                success: function() { /* success handling like a redirect to sensitive page */ },
                error: funciton() { /* tell user something bad happened */ }
            });
        });

        //the dom should have div with id matching what is supplied below.
        googleAuth.render('googleSignInButton');
    });
});
```

And an simple example to sign out the user.
```js
$(document).ready(function() {
    window.gapi.load('auth2', function() {
        var googleAuth = window.gapi.auth2.init();
        googleAuth.signOut();
        //now the user is signed out of the Google client library in the browser.
        //e.g. redirect to login page.
    });
});
```

### Documentation
The GoogleIdTokenStrategy class takes a configuration object and verification
function like so `new GoogleIdTokenStrategy(options, verify);`

`options` can contain the following fields:
- `tokenParamName` - an optional string that is the query parameter name to get the id token value from.
default is `id_token`.
- `tokenInfoUrl` - an optional string that is the url to get token info from Google.
default is 'https://www.googleapis.com/oauth2/v3/tokeninfo'.

And the `verify` function will be called with the following parameters. This is where you get to do your thing.
- `profile` - object containing the following fields:
    - `iss` - string that is the issuer of the Google token. Should be `https://accounts.google.com`
    - `sub` - string that is the unique Google id of the user.
    - `azp` - string that is the application's client id.
    - `aud` - string that is the application's client id.
    - `iat` - Date that is the time at which the token was issued.
    - `exp` - Date that is the time at wcich the token expires. If the current time is after this value,
        then `passport.authenticate` will fail before `verify` is even called.
    - `hd` - string that is the hosted domain of the user. This will only be present if the user belongs
        to a Google Apps for Work hosted domain.

    The following fields are only included when the user has granted the 'profile' and 'email' OAuth scopes to your application.
    - `email` - string that is the Google user's email.
    - `email_verified` - string 'true' or 'false'
    - `name` - string that is the name of the user.
    - `picture` - string url of link to user profile picture.
    - `given_name` - string.
    - `family_name` - string.
    - `locale` - string.

#### Other Information
The Google endpoint's documentation can be seen here:
https://developers.google.com/identity/sign-in/web/backend-auth#calling-the-tokeninfo-endpoint
