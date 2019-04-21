/* eslint-env jasmine */
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const dirCompare = require('dir-compare');
const cheerio = require('cheerio');

require('jasmine-expect');
const { addMatchers } = require('add-matchers');

const matchersByName = {
  toBeTag (tagProperties, actual) {
    const node = actual.length > 0 ? actual[0] : actual;
    if (!node || node.tagName !== tagProperties.tagName) {
      return false;
    }
    if (tagProperties.attributes) {
      const tagAttrs = tagProperties.attributes;
      const nodeAttrs = node.attribs || {};
      return !Object.keys(tagAttrs).some(tagAttr => tagAttrs[tagAttr] !== nodeAttrs[tagAttr]);
    } else {
      return true;
    }
  }
};

addMatchers(matchersByName);

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const HtmlWebpackDeployPlugin = require('../src');

const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILENAME = '[name].js';

const FIXTURES_PATH = path.join(__dirname, './fixtures');
const FIXTURES_ENTRY = path.join(FIXTURES_PATH, 'entry.js');
const FIXTURES_STYLE = path.join(FIXTURES_PATH, 'app.css');

const WEBPACK_CSS_RULE = { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] };

const WEBPACK_ENTRY = {
  app: FIXTURES_ENTRY,
  style: FIXTURES_STYLE
};

const WEBPACK_OUTPUT = {
  path: OUTPUT_DIR,
  filename: OUTPUT_FILENAME
};

const WEBPACK_MODULE = {
  rules: [WEBPACK_CSS_RULE]
};

const areEqualDirectories = (dirA, dirB, { loose = false, files = null } = {}) => {
  const pathA = path.resolve(__dirname, dirA);
  const pathB = path.resolve(__dirname, dirB);
  const includeFilter = files ? files.join(',') : null;
  const compareSyncOptions = {
    compareSize: true
  };
  if (includeFilter) {
    compareSyncOptions.includeFilter = includeFilter;
  }
  const compareResult = dirCompare.compareSync(pathA, pathB, compareSyncOptions);
  if (files && compareResult.totalFiles !== files.length) {
    return false;
  }
  return (loose ? (compareResult.right === 0) : compareResult.same);
};

const createWebpackConfig = ({
  webpackPublicPath = void 0,
  htmlOptions = {},
  options = {}
} = {}) => {
  return {
    entry: { ...WEBPACK_ENTRY },
    output: {
      ...WEBPACK_OUTPUT,
      ...(webpackPublicPath ? { publicPath: webpackPublicPath } : {})
    },
    module: { ...WEBPACK_MODULE },
    plugins: [
      new MiniCssExtractPlugin({ filename: '[name].css' }),
      new HtmlWebpackPlugin(htmlOptions),
      new HtmlWebpackDeployPlugin(options)
    ]
  };
};

describe('html-webpack-deploy-plugin', () => {
  beforeEach(done => {
    rimraf(OUTPUT_DIR, done);
  });

  it('it does nothing for empty options', done => {
    webpack(createWebpackConfig(), (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', (er, data) => {
        expect(er).toBeFalsy();
        const $ = cheerio.load(data);
        expect($('script').length).toBe(2);
        expect($('link').length).toBe(1);
        expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
        expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
        expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
        done();
      });
    });
  });

  it('it copies and includes css from bootstrap', done => {
    webpack(createWebpackConfig({
      options: {
        packages: {
          'bootstrap': {
            assets: {
              'dist/css': 'css/'
            },
            links: [
              'css/bootstrap.min.css'
            ]
          }
        }
      }
    }), (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', (er, data) => {
        expect(areEqualDirectories('../node_modules/bootstrap/dist/css', '../dist/bootstrap-4.3.1/css')).toBe(true);
        expect(er).toBeFalsy();
        const $ = cheerio.load(data);
        expect($('script').length).toBe(2);
        expect($('link').length).toBe(2);
        expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
        expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
        expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
        expect($('link[href="bootstrap-4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
        done();
      });
    });
  });

  it('it copies and includes local assets', done => {
    webpack(createWebpackConfig({
      options: {
        assets: {
          'spec/fixtures/assets/foo.js': 'assets'
        }
      }
    }), (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      expect(areEqualDirectories('fixtures/assets', '../dist/assets', { files: ['foo.js'] })).toBe(true);
      done();
    });
  });

  it('it copies and includes links', done => {
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
        new HtmlWebpackDeployPlugin({
          assets: {
          },
          links: [
            {
              path: 'the-href',
              attributes: {
                'rel': 'the-rel'
              }
            }
          ]
        })
      ]
    }, (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const htmlFile = path.resolve(__dirname, '../dist/index.html');
      fs.readFile(htmlFile, 'utf8', (er, data) => {
        expect(er).toBeFalsy();
        const $ = cheerio.load(data);
        expect($('script').length).toBe(1);
        expect($('link').length).toBe(1);
        expect($('link[href="/public-path/the-href"]')).toBeTag({ tagName: 'link', attributes: { href: '/public-path/the-href', rel: 'the-rel' } });
        done();
      });
    });
  });
});
