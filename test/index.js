
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
});
