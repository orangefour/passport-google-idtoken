
var assert = require('assert');

var GoogleIdTokenStrategy = require('../index');

describe('GoogleIdTokenStrategy', function() {

    describe('#constructor', function() {
        it('should set name', function() {
            var s = new GoogleIdTokenStrategy();
            assert.strictEqual(s.name, 'google-idtoken');
        });

        it('should set fields to those given in options', function() {
            var s = new GoogleIdTokenStrategy({
                tokenParamName: 'tokenParamName',
                tokenInfoUrl: 'tokenInfoUrl'
            });
            assert.strictEqual(s.tokenParamName, 'tokenParamName');
            assert.strictEqual(s.tokenInfoUrl, 'tokenInfoUrl');
        });

        it('should set fields to defaults if not given', function() {
            var s = new GoogleIdTokenStrategy(null);
            assert.strictEqual(s.tokenParamName, 'id_token');
            assert.strictEqual(s.tokenInfoUrl, 'https://www.googleapis.com/oauth2/v3/tokeninfo');
        });

        it('should set verify', function () {
            var s = new GoogleIdTokenStrategy(null, 'verify');
            assert.strictEqual(s.verify, 'verify');
        });
    });

    describe('#authenticate', function() {
        it('should call done() with error if could not get id token from request', function(done) {
            var s = new GoogleIdTokenStrategy();
            s.done = function(error) {
                assert.strictEqual(error, 'parameter id_token is not present in req');
                done();
            };
            s.paramFromRequest = function() { return ''; };
            s.authenticate(null, null);
        });

        it('should call done() with error if validateIdToken() returns an error', function(done) {
            var s = new GoogleIdTokenStrategy();
            s.done = function(error) {
                assert.strictEqual(error, 'error');
                done();
            };
            s.paramFromRequest = function() { return 'id_token'; };
            s.validateIdToken = function(token, callback) {
                callback('error');
            };
            s.authenticate();
        });

        it('should call verify', function(done) {
            var s = new GoogleIdTokenStrategy({}, function(profile, done) {
                assert.strictEqual(profile, 'profile');
                done();
            });
            s.done = done;
            s.paramFromRequest = function(req, name) {
                assert.strictEqual(req, 'req');
                assert.strictEqual(name, s.tokenParamName);
                return 'token_value';
            };
            s.validateIdToken = function(token, callback) {
                assert.strictEqual(token, 'token_value');
                callback(null, 'profile');
            };
            s.authenticate('req');
        });
    });

    describe('#done', function() {
        it('should call this.error() if error is truthy', function(done) {
            var s = new GoogleIdTokenStrategy();
            s.error = function(error) {
                assert.strictEqual(error, 'error');
                done();
            };
            s.done('error');
        });

        it('should call this.fail() if user is falsey', function(done) {
            var s = new GoogleIdTokenStrategy();
            s.fail = function(info) {
                assert.strictEqual(info, 'info');
                done();
            };
            s.done(null, false, 'info');
        });

        it('should call this.success() if no error and user if truthy', function(done) {
            var s = new GoogleIdTokenStrategy();
            s.success = function(user) {
                assert.strictEqual(user, 'user');
                done();
            };
            s.done(null, 'user');
        });
    });

    describe('#paramFromRequest', function() {
        it('should return body value if present', function() {
            var s = new GoogleIdTokenStrategy();
            var result = s.paramFromRequest({
                body: {
                    name: 'body'
                },
                query: {
                    name: 'query'
                },
                params: {
                    name: 'params'
                }
            }, 'name');
            assert.strictEqual(result, 'body');
        });

        it('should return query value if present', function() {
            var s = new GoogleIdTokenStrategy();
            var result = s.paramFromRequest({
                query: {
                    name: 'query'
                },
                params: {
                    name: 'params'
                }
            }, 'name');
            assert.strictEqual(result, 'query');
        });

        it('should return params value if present', function() {
            var s = new GoogleIdTokenStrategy();
            var result = s.paramFromRequest({
                params: {
                    name: 'params'
                }
            }, 'name');
            assert.strictEqual(result, 'params');
        });

        it('should return empty string if none are present', function() {
            var s = new GoogleIdTokenStrategy();
            assert.strictEqual(s.paramFromRequest({}, 'name'), '');
        });
    });

    describe('#validateToken', function() {
        it('should callback error if post return an error', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback('error');
                }
            };
            s.validateIdToken(null, function(error) {
                assert.strictEqual(error, 'error');
                done();
            }, poster);
        });

        it('should callback error if could not parse body', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback(null, null, 'body');
                }
            };
            s.validateIdToken(null, function(error) {
                assert.strictEqual(error, 'Could not parse response: body');
                done();
            }, poster);
        });

        it('should callback error if exp not defined', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback(null, null, JSON.stringify({
                        email: 'something'
                    }));
                }
            };
            s.validateIdToken(null, function(error) {
                assert.strictEqual(error, 'profile.exp and profile.email must be defined in token info response');
                done();
            }, poster);
        });

        it('should callback error if email not defined', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback(null, null, JSON.stringify({
                        exp: '10002'
                    }));
                }
            };
            s.validateIdToken(null, function(error) {
                assert.strictEqual(error, 'profile.exp and profile.email must be defined in token info response');
                done();
            }, poster);
        });

        it('should callback error if token is expired', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback(null, null, JSON.stringify({
                        exp: (Math.floor(new Date().getTime() / 1000)) + '',
                        email: 'email'
                    }));
                }
            };
            s.validateIdToken(null, function(error) {
                assert.strictEqual(error, 'Token is expired');
                done();
            }, poster);
        });

        it('should callback profile if no validation problems', function(done) {
            var s = new GoogleIdTokenStrategy();
            var poster = {
                post: function(stuff, callback) {
                    callback(null, null, JSON.stringify({
                        exp: (Math.floor((new Date().getTime() + 10000) / 1000)) + '',
                        email: 'email'
                    }));
                }
            };
            s.validateIdToken(null, done, poster);
        });
    });

    describe('#makeProfile', function() {
        it('should return correct object if valid', function() {
            var s = new GoogleIdTokenStrategy();
            var result = s.makeProfile({
                iss: 'iss',
                sub: 'sub',
                azp: 'azp',
                aud: 'aud',
                iat: '4',
                exp: '4',
                hd: 'hd',
                email: 'email',
                email_verified: 'email_verified',
                name: 'name',
                picture: 'picture',
                given_name: 'given_name',
                family_name: 'family_name',
                locale: 'locale'
            });
            assert.deepEqual(result, {
                iss: 'iss',
                sub: 'sub',
                azp: 'azp',
                aud: 'aud',
                iat: new Date(4000),
                exp: new Date(4000),
                hd: 'hd',
                email: 'email',
                email_verified: 'email_verified',
                name: 'name',
                picture: 'picture',
                given_name: 'given_name',
                family_name: 'family_name',
                locale: 'locale'
            });
        });

        it('should return correct object if not valid', function() {
            var s = new GoogleIdTokenStrategy();
            var result = s.makeProfile({
                iss: 'iss',
                sub: 'sub',
                azp: 'azp',
                aud: 'aud',
                hd: 'hd',
                email: 'email',
                email_verified: 'email_verified',
                name: 'name',
                picture: 'picture',
                given_name: 'given_name',
                family_name: 'family_name',
                locale: 'locale'
            });
            assert.deepEqual(result, {
                iss: 'iss',
                sub: 'sub',
                azp: 'azp',
                aud: 'aud',
                iat: undefined,
                exp: undefined,
                hd: 'hd',
                email: 'email',
                email_verified: 'email_verified',
                name: 'name',
                picture: 'picture',
                given_name: 'given_name',
                family_name: 'family_name',
                locale: 'locale'
            });
        });
    });
});
