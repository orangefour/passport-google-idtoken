
var Strategy = require('passport').Strategy;
var request = require('request');
var util = require('util');
var _ = require('underscore');

/**
 * A Passport Strategy for authenticating a User with Google from a Google
 * supplied id token from their client library.
 *
 * @param options {object} should contain the following properties:
 *  tokenParamName {string, optional} the query parameter name to get the id token value from. default is 'id_token'.
 *  tokenInfoUrl {string, optional} the url to get token info from Google. default is 'https://www.googleapis.com/oauth2/v3/tokeninfo'.
 * @param verify {function} the callback function that authenticates a User.
 *  Parameters to verify are as follows:
 *      profile {object} with properties:
 *          iss {string} - issuer of token. should be 'https://accounts.google.com'
 *          sub {string} - unique Google ID of the user.
 *          azp {string} - application's client id.
 *          aud {string} - application's client id.
 *          iat {Date} - time at which the token was issued.
 *          exp {Date} - time at which the token will expire.
 *          hd {string} - the hosted domain of the user. only present if user belongs to Google Apps for Work hosted domain.
 *
 *      The following fields are only included when the user has granted the 'profile' and 'email'
 *      OAuth scoped to the application.
 *          email {string} - the Google user's email.
 *          email_verified {string} - 'true' or 'false'.
 *          name {string}
 *          picture {string} - url.
 *          given_name {string}
 *          family_name {string}
 *          locale {string}
 */
var GoogleIdTokenStrategy = function(options, verify) {
    Strategy.call(this);

    //this is the name that will need to be used in client code.
    this.name = 'google-idtoken';

    this.tokenParamName = options.tokenParamName || 'id_token';
    this.tokenInfoUrl = options.tokenInfoUrl || 'https://www.googleapis.com/oauth2/v3/tokeninfo';
    this.verify = verify;
}

util.inherits(GoogleIdTokenStrategy, Strategy);

/**
 * Authentication entrypoint called from Passport.
 * @inheritDoc.
 */
GoogleIdTokenStrategy.prototype.authenticate = function(req, options) {
    var idToken = this.paramFromRequest(req, this.tokenParamName);
    if (!idToken) {
        return done('parameter ' + this.tokenParamName + ' is not present in req');
    }
    this.validateIdToken(idToken, function(error, profile) {
        if (error) {
            return done(error);
        }
        return self.verify(profile, done);
    });
}

/**
 * Callback for when a user has been found from verify client code.
 * @param error {mixed} the error while verifying the user.
 * @param user {mixed} the user.
 * @param info {object}.
 */
GoogleIdTokenStrategy.prototype.done = function(error, user, info) {
    if (error) {
        return this.error(error);
    } else if (!user) {
        return this.fail(info);
    }
    this.success(user);
}

/**
 * Gets the id token value from req using name for lookup in req.body, req.query,
 * and req.params.
 * @param req {Express Request}
 * @parma name {string} the key to use to lookup id token in req.
 */
GoogleIdTokenStrategy.prototype.paramFromRequest = function(req, name) {
    var body = req.body || {};
    var query = req.query || {};
    var params = req.params || {};
    if (body[name]) {
        return body[name];
    }
    if (query[name]) {
        return query[name];
    }
    return params[name] || '';
}

/**
 * Validates that idToken is valid by getting token info from the token info endpoint from Google.
 * @param idToken {string} the id token from a Google client.
 * @param callback {function} profile object callback.
 */
GoogleIdTokenStrategy.prototype.validateIdToken = function(idToken, callback) {
    request.post({
        url: this.tokenInfoUrl,
        form: {
            id_token: idToken
        }
    }, (error, response, body) => {
        if (error) {
            return callback(error);
        }
        var profile = {};
        try {
            profile = this.makeProfile(JSON.parse(body));
        } catch (e) {
            callback('Could not parse response: ' + body);
        }
        if (!(profile.exp && profile.email)) {
            return callback('profile.exp and profile.email must be defined in token info response');
        }
        if ((new Date()).getTime() > profile.exp) {
            return callback('Token is expired');
        }
        callback(null, profile);
    });
}

/**
 * Creates a profile object (to send to this.verify) from Google's token info response.
 * @param response {object} JSON parsed response body from Google token info endpoint.
 * @return {object} with email and exp fields.
 */
GoogleIdTokenStrategy.prototype.makeProfile = function(response) {
    var result = {
        iss: response.iss,
        sub: response.sub,
        azp: response.azp,
        aud: response.aud,
        iat: response.iat,
        exp: response.exp,
        hd: response.hd,

        email: response.email,
        email_verified: response.email_verified,
        name: response.name,
        picture: response.picture,
        given_name: response.given_name,
        family_name: response.family_name,
        locale: response.locale
    };
    //multiply by 1000 here because Google returns number of seconds and we need millseconds for Date.
    result.iat = new Date(1000 * parseInt(response.iat));
    result.exp = new Date(1000 * parseInt(response.exp));
    return result;
}

module.exports = GoogleIdTokenStrategy;
