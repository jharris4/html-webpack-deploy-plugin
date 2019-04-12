var rimraf = require('rimraf');
var expect = require('expect');
var path = require('path');
var fs = require('fs');
var dirCompare = require('dir-compare');
var cheerio = require('cheerio');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackDeployAssetsPlugin = require('../src');

var OUTPUT_DIR = path.join(__dirname, '../dist');

function directoriesAreEqual(dirA, dirB) {
  var res = dirCompare.compareSync(path.resolve(__dirname, dirA), path.resolve(__dirname, dirB), { compareSize: true });
  return res.same;
}

describe('html-webpack-deploy-assets-plugin', function() {
  beforeEach(function(done) {
    rimraf(OUTPUT_DIR, done);
  });

  it('it does nothing for empty options', function(done) {
    webpack({
      entry: {
        app: path.join(__dirname, 'fixtures', 'entry.js')
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js'
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new HtmlWebpackDeployAssetsPlugin()
      ]
    }, function (err, result) {
      expect(err).toNotExist();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      var htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', function (er, data) {
        expect(er).toNotExist();
        var $ = cheerio.load(data);
        expect($('script').length).toBe(1);
        expect($('link').length).toBe(0);
        expect($('script[src="app.js"]').toString()).toBe('<script type="text/javascript" src="app.js"></script>');
        done();
      });
    });
  });

  it('it copies and includes css from bootstrap', function(done) {
    webpack({
      entry: {
        app: path.join(__dirname, 'fixtures', 'entry.js')
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js'
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new HtmlWebpackDeployAssetsPlugin({
          "packages": {
            "bootstrap": {
              "assets": {
                "dist/css": "css/"
              },
              "entries": [
                "css/bootstrap.min.css"
              ]
            }
          }
        })
      ]
    }, function (err, result) {
      expect(err).toNotExist();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      var htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', function (er, data) {
        expect(directoriesAreEqual('../node_modules/bootstrap/dist/css', '../dist/bootstrap-4.3.1/css')).toBe(true);
        expect(er).toNotExist();
        var $ = cheerio.load(data);
        expect($('script').length).toBe(1);
        expect($('link').length).toBe(1);
        expect($('script[src="app.js"]').toString()).toBe('<script type="text/javascript" src="app.js"></script>');
        expect($('link[href="bootstrap-4.3.1/css/bootstrap.min.css"]').toString()).toBe('<link href="bootstrap-4.3.1/css/bootstrap.min.css" rel="stylesheet">');
        done();
      });
    });
  });

  it('it copies and includes local assets', function(done) {
    webpack({
      entry: {
        app: path.join(__dirname, 'fixtures', 'entry.js')
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js'
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new HtmlWebpackDeployAssetsPlugin({
          "assets": {
            "test/fixtures/entry.js": "fixtures"
          }
        })
      ]
    }, function (err, result) {
      expect(err).toNotExist();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      expect(directoriesAreEqual('fixtures', '../dist/fixtures')).toBe(true);
      done();
    });
  });

  it('it copies and includes links', function (done) {
    webpack({
      entry: {
        app: path.join(__dirname, 'fixtures', 'entry.js')
      },
      output: {
        publicPath: '/public-path/',
        path: OUTPUT_DIR,
        filename: '[name].js'
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new HtmlWebpackDeployAssetsPlugin({
          "assets": {
          },
          "links": [
            {
              "href": "the-href",
              "rel": "the-rel"
            }
          ]
        })
      ]
    }, function (err, result) {
      expect(err).toNotExist();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      var htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', function (er, data) {
        expect(er).toNotExist();
        var $ = cheerio.load(data);
        expect($('script').length).toBe(1);
        expect($('link').length).toBe(1);
        expect($('link[href="/public-path/the-href"]').toString()).toBe('<link href="/public-path/the-href" rel="the-rel">');
        done();
      });
    });
  });
});