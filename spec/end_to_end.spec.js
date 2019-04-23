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

const OUTPUT_FILENAME = '[name].js';

const FIXTURES_PATH = path.join(__dirname, './fixtures');
const FIXTURES_ENTRY = path.join(FIXTURES_PATH, 'entry.js');
const FIXTURES_STYLE = path.join(FIXTURES_PATH, 'app.css');

const OUTPUT_DIR = path.join(FIXTURES_PATH, 'dist');
const OUPUT_HTML_FILE = path.join(OUTPUT_DIR, 'index.html');

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
  webpackMode = 'production',
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
    ],
    mode: webpackMode
  };
};

describe('end to end', () => {
  beforeEach(done => {
    rimraf(OUTPUT_DIR, done);
  });

  it('it does nothing for empty options', done => {
    webpack(createWebpackConfig(), (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
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

  describe('packages', () => {
    it('it copies and includes css from bootstrap', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [{
                from: 'dist/css', to: 'css/'
              }],
              links: [
                'css/bootstrap.min.css'
              ]
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          done();
        });
      });
    });

    it('it uses a custom addPackagePath option ', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [{
                from: 'dist/css', to: 'css/'
              }],
              links: [
                'css/bootstrap.min.css'
              ]
            }
          },
          addPackagePath: (packageName, packageVersion, packagePath) => path.join('my-packages', packageName + '-' + packageVersion, packagePath)
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/my-packages/bootstrap-4.3.1/css`)).toBe(true);
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="my-packages/bootstrap-4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'my-packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          done();
        });
      });
    });

    it('applies a package script variableName properly', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [
                { from: 'dist/css', to: 'css/' },
                { from: 'dist/js', to: 'js/' }
              ],
              links: [
                'css/bootstrap.min.css'
              ],
              scripts: {
                variableName: 'Bootstrap',
                path: 'js/bootstrap.bundle.min.js'
              }
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        expect(JSON.stringify(result.compilation.options.externals)).toBe('{"bootstrap":"Bootstrap"}');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
          expect(areEqualDirectories('../node_modules/bootstrap/dist/js', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/js`)).toBe(true);
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(3);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect($('script[src="packages/bootstrap-4.3.1/js/bootstrap.bundle.min.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/js/bootstrap.bundle.min.js' } });
          done();
        });
      });
    });

    it('injects cdn urls when useCdn is true', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [
                { from: 'dist/css', to: 'css/' },
                { from: 'dist/js', to: 'js/' }
              ],
              links: [
                'css/bootstrap.min.css'
              ],
              scripts: {
                // variableName: 'Bootstrap',
                path: 'js/bootstrap.bundle.min.js'
              }
            }
          },
          useCdn: true
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        // expect(JSON.stringify(result.compilation.options.externals)).toBe('{"bootstrap":"Bootstrap"}');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
          expect(areEqualDirectories('../node_modules/bootstrap/dist/js', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/js`)).toBe(true);
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(3);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="https://unpkg.com/bootstrap@4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'https://unpkg.com/bootstrap@4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect($('script[src="https://unpkg.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'https://unpkg.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js' } });
          done();
        });
      });
    });

    it('injects cdn urls when useCdn is true but not for tags that have useCdn false', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              links: [
                'link-a',
                {
                  path: 'link-b',
                  useCdn: false
                }
              ],
              scripts: [
                {
                  path: 'script-a',
                  useCdn: false
                },
                'script-b'
              ]
            }
          },
          getCdnPath: (packageName, packageVersion, packagePath) => `http://mydomain.com/${packageName}@${packageVersion}/${packagePath}`,
          useCdn: true
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(4);
          expect($('link').length).toBe(3);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="http://mydomain.com/bootstrap@4.3.1/link-a"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bootstrap@4.3.1/link-a', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-4.3.1/link-b"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/link-b', 'rel': 'stylesheet' } });
          expect($('script[src="packages/bootstrap-4.3.1/script-a"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/script-a' } });
          expect($('script[src="http://mydomain.com/bootstrap@4.3.1/script-b"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bootstrap@4.3.1/script-b' } });
          done();
        });
      });
    });

    it('injects cdn urls when useCdn is true or false at the package or tag level', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              links: [
                'link-a',
                {
                  path: 'link-b',
                  useCdn: false
                }
              ],
              scripts: [
                {
                  path: 'script-a',
                  useCdn: false
                },
                'script-b'
              ]
            },
            'bulma': {
              links: [
                'link-c',
                {
                  path: 'link-d',
                  useCdn: true
                }
              ],
              scripts: [
                {
                  path: 'script-c',
                  useCdn: true
                },
                'script-d'
              ],
              useCdn: false
            }
          },
          getCdnPath: (packageName, packageVersion, packagePath) => `http://mydomain.com/${packageName}@${packageVersion}/${packagePath}`,
          useCdn: true
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(6);
          expect($('link').length).toBe(5);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="http://mydomain.com/bootstrap@4.3.1/link-a"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bootstrap@4.3.1/link-a', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-4.3.1/link-b"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/link-b', 'rel': 'stylesheet' } });
          expect($('script[src="packages/bootstrap-4.3.1/script-a"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/script-a' } });
          expect($('script[src="http://mydomain.com/bootstrap@4.3.1/script-b"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bootstrap@4.3.1/script-b' } });
          expect($('link[href="packages/bulma-0.7.4/link-c"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bulma-0.7.4/link-c', 'rel': 'stylesheet' } });
          expect($('link[href="http://mydomain.com/bulma@0.7.4/link-d"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bulma@0.7.4/link-d', 'rel': 'stylesheet' } });
          expect($('script[src="http://mydomain.com/bulma@0.7.4/script-c"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bulma@0.7.4/script-c' } });
          expect($('script[src="packages/bulma-0.7.4/script-d"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bulma-0.7.4/script-d' } });

          done();
        });
      });
    });

    it('injects cdn urls with a custom getCdnPath', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [
                { from: 'dist/css', to: 'css/' },
                { from: 'dist/js', to: 'js/' }
              ],
              links: [
                'css/bootstrap.min.css'
              ],
              scripts: {
                // variableName: 'Bootstrap',
                path: 'js/bootstrap.bundle.min.js'
              }
            }
          },
          useCdn: true,
          getCdnPath: (packageName, packageVersion, packagePath) => `https://mydomain.com/${packageName}@${packageVersion}/${packagePath}`
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        // expect(JSON.stringify(result.compilation.options.externals)).toBe('{"bootstrap":"Bootstrap"}');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
          expect(areEqualDirectories('../node_modules/bootstrap/dist/js', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/js`)).toBe(true);
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(3);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="https://mydomain.com/bootstrap@4.3.1/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'https://mydomain.com/bootstrap@4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect($('script[src="https://mydomain.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'https://mydomain.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js' } });
          done();
        });
      });
    });

    it('injects any specified cdnPath', done => {
      webpack(createWebpackConfig({
        options: {
          useCdn: true,
          getCdnPath: (packageName, packageVersion, packagePath) => `http://abc.com/${packageName}@${packageVersion}/${packagePath}`,
          packages: {
            'bootstrap': {
              links: [
                'style-a.css',
                {
                  path: 'style-b.css',
                  cdnPath: 'cdn-style-b.css'
                }
              ],
              scripts: {
                path: 'script-a.js',
                cdnPath: 'cdn-script-a.js'
              }
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        // expect(JSON.stringify(result.compilation.options.externals)).toBe('{"bootstrap":"Bootstrap"}');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(3);
          expect($('link').length).toBe(3);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="http://abc.com/bootstrap@4.3.1/style-a.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'http://abc.com/bootstrap@4.3.1/style-a.css', 'rel': 'stylesheet' } });
          expect($('link[href="http://abc.com/bootstrap@4.3.1/cdn-style-b.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'http://abc.com/bootstrap@4.3.1/cdn-style-b.css', 'rel': 'stylesheet' } });
          expect($('script[src="http://abc.com/bootstrap@4.3.1/cdn-script-a.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'http://abc.com/bootstrap@4.3.1/cdn-script-a.js' } });
          done();
        });
      });
    });

    it('uses a custom findPackagePath option', done => {
      webpack(createWebpackConfig({
        options: {
          packages: {
            'bootstrap': {
              copy: [{
                from: 'dist/css', to: 'css/'
              }],
              links: [
                'css/bootstrap.min.css'
              ]
            }
          },
          findPackagePath: (cwd, packageName) => path.join(FIXTURES_PATH, 'node_modules', packageName)
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-fake-version/css/bootstrap.min.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-fake-version/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          done();
        });
      });
    });

    it('applies devPath in development mode', done => {
      webpack(createWebpackConfig({
        webpackMode: 'development',
        options: {
          packages: {
            'bootstrap': {
              copy: [{
                from: 'dist/css', to: 'css/'
              }],
              links: {
                path: 'css/bootstrap.min.css',
                devPath: 'css/bootstrap.css'
              }
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="packages/bootstrap-4.3.1/css/bootstrap.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.css', 'rel': 'stylesheet' } });
          done();
        });
      });
    });
  });

  describe('assets', () => {
    it('it copies assets copy', done => {
      webpack(createWebpackConfig({
        options: {
          assets: {
            copy: [{ from: 'spec/fixtures/assets/foo.js', to: 'foo.js' }]
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        expect(areEqualDirectories('fixtures/assets', `${OUTPUT_DIR}/assets`, { files: ['foo.js'] })).toBe(true);
        done();
      });
    });

    it('it includes assets links', done => {
      webpack(createWebpackConfig({
        webpackPublicPath: '/public-path/',
        options: {
          assets: {
            links: [
              {
                path: 'the-href',
                attributes: {
                  'rel': 'the-rel'
                }
              }
            ]
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="/public-path/app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': '/public-path/app.js', 'type': 'text/javascript' } });
          expect($('script[src="/public-path/style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': '/public-path/style.js', 'type': 'text/javascript' } });
          expect($('link[href="/public-path/style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': '/public-path/style.css', 'rel': 'stylesheet' } });
          expect($('link[href="/public-path/assets/the-href"]')).toBeTag({ tagName: 'link', attributes: { href: '/public-path/assets/the-href', rel: 'the-rel' } });
          done();
        });
      });
    });

    it('it uses a custom addAssetPath option ', done => {
      webpack(createWebpackConfig({
        webpackPublicPath: '/public-path/',
        options: {
          assets: {
            links: [
              {
                path: 'the-href',
                attributes: {
                  'rel': 'the-rel'
                }
              }
            ]
          },
          addAssetPath: assetPath => path.join('my-assets', assetPath)
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(2);
          expect($('link').length).toBe(2);
          expect($('script[src="/public-path/app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': '/public-path/app.js', 'type': 'text/javascript' } });
          expect($('script[src="/public-path/style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': '/public-path/style.js', 'type': 'text/javascript' } });
          expect($('link[href="/public-path/style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': '/public-path/style.css', 'rel': 'stylesheet' } });
          expect($('link[href="/public-path/my-assets/the-href"]')).toBeTag({ tagName: 'link', attributes: { href: '/public-path/my-assets/the-href', rel: 'the-rel' } });
          done();
        });
      });
    });

    it('applies devPath in development mode', done => {
      webpack(createWebpackConfig({
        webpackMode: 'development',
        options: {
          assets: {
            copy: [{
              from: path.join(FIXTURES_PATH, 'assets'), to: 'my-assets/'
            }],
            links: {
              path: 'my-assets/foo.min.css',
              devPath: 'my-assets/foo.css'
            },
            scripts: {
              path: 'my-assets/foo.min.js',
              devPath: 'my-assets/foo.js'
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');
        fs.readFile(OUPUT_HTML_FILE, 'utf8', (er, data) => {
          expect(er).toBeFalsy();
          const $ = cheerio.load(data);
          expect($('script').length).toBe(3);
          expect($('link').length).toBe(2);
          expect($('script[src="app.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect($('script[src="style.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect($('link[href="style.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect($('link[href="assets/my-assets/foo.css"]')).toBeTag({ tagName: 'link', attributes: { 'href': 'assets/my-assets/foo.css', 'rel': 'stylesheet' } });
          expect($('script[src="assets/my-assets/foo.js"]')).toBeTag({ tagName: 'script', attributes: { 'src': 'assets/my-assets/foo.js', 'type': 'text/javascript' } });
          done();
        });
      });
    });
  });
});
