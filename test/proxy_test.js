var fs = require('fs');
var expect = require('chai').expect;
var nineTrack = require('../');
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

describe('A server', function () {
  serverUtils.run(1337, function (req, res) {
    res.send('oh hai');
  });

  describe('being proxied by `nine-track.proxy`', function () {
    var fixtureDir = __dirname + '/actual-files/basic-proxy';
    serverUtils.runNineProxyServer(1339, {
      fixtureDir: fixtureDir
    });

    describe('when requested once', function () {
      httpUtils.save({
        url: 'http://localhost:1337/',
        proxy: 'http://localhost:1339/'
      });

      it('touches the server', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });

      it('receives the expected response', function () {
        expect(this.err).to.equal(null);
        expect(this.res.statusCode).to.equal(200);
        expect(this.body).to.equal('oh hai');
      });

      it('writes the response to a file', function () {
        var files = fs.readdirSync(fixtureDir);
        expect(files).to.have.property('length', 1);
      });

      describe('and when requested again', function () {
        httpUtils.save('http://localhost:1338/');

        it('does not touch the server', function () {
          expect(this.requests[1337]).to.have.property('length', 1);
        });

        it('receives the expected response', function () {
          expect(this.err).to.equal(null);
          expect(this.res.statusCode).to.equal(200);
          expect(this.body).to.equal('oh hai');
        });
      });
    });
  });
});

describe.skip('An `nine-track` loading from a saved file', function () {
  serverUtils.run(1337, function (req, res) {
    // DEV: Same length as 'oh hai' for easier development =P
    res.send('NOOOOO');
  });
  serverUtils.run(1338, nineTrack({
    fixtureDir: __dirname + '/test-files/saved-proxy',
    // DEV: We normalize connection info across Node.js versions (changed after Node.js@0.10)
    normalizeFn: function (info) {
      info.headers.connection = 'keep-alive';
    },
    url: 'http://localhost:1337'
  }));

  describe('a request to a canned response', function () {
    httpUtils.save({
      url: 'http://localhost:1338/'
    });

    it('uses the saved response', function () {
      expect(this.err).to.equal(null);
      expect(this.body).to.equal('oh hai');
    });
  });

  // DEV: This is a test for verifying we don't contaminate our cache
  describe('when a response is modified', function () {
    httpUtils.save({
      url: 'http://localhost:1338/'
    });
    before(function () {
      this.res.body = 'hello';
    });
    httpUtils.save({
      url: 'http://localhost:1338/'
    });

    it('does not impact the original data', function () {
      expect(this.res.body).to.equal('oh hai');
    });
  });
});
