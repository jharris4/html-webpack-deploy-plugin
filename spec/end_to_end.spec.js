/* eslint-env jasmine */
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const dirCompare = require('dir-compare');
const cheerio = require('cheerio');

require('jasmine-expect');
const { addMatchers } = require('add-matchers');

const matcherToBeTag = (tagProperties, actual) => {
  if (!actual) {
    return false;
  }
  const node = actual;
  const nodeTagName = node.tagName || node.name;
  if (!nodeTagName || nodeTagName !== tagProperties.tagName) {
    return false;
  }
  if (tagProperties.attributes) {
    const tagAttrs = tagProperties.attributes;
    const nodeAttrs = node.attribs || {};
    return !Object.keys(tagAttrs).some(tagAttr => tagAttrs[tagAttr] !== nodeAttrs[tagAttr]);
  } else {
    return true;
  }
};

const matcherToContainTag = (tagProperties, actual) => {
  return actual.some(tag => matcherToBeTag(tagProperties, tag));
};

const matchersByName = {
  toBeTag: matcherToBeTag,
  toContainTag: matcherToContainTag
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

const cheerioLoadTags = (file, tagsCallback) => {
  fs.readFile(file, 'utf8', (er, data) => {
    expect(er).toBeFalsy();
    const $ = cheerio.load(data);
    const cheerioLinks = $('link');
    const cheerioScripts = $('script');
    const links = cheerioLinks.get().map((link, i) => ({ ...link, jasmineToString: $(link).toString }));
    const scripts = cheerioScripts.get().map((script, i) => ({ ...script, jasmineToString: $(script).toString }));
    links.jasmineToString = () => cheerioLinks.toString();
    scripts.jasmineToString = () => cheerioScripts.toString();
    tagsCallback({
      scripts,
      links,
      data
    });
  });
};

describe('end to end', () => {
  beforeEach(done => {
    rimraf(OUTPUT_DIR, done);
  });

  it('it does nothing for empty options', done => {
    webpack(createWebpackConfig(), (err, result) => {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
        expect(links.length).toBe(1);
        expect(scripts.length).toBe(2);
        expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
        expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
        expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });

        done();
      });
    });
  });

  describe('tags plugin passthrough options', () => {
    describe('append', () => {
      describe('root level', () => {
        const baseOptions = {
          assets: {
            links: 'abc.css',
            scripts: [{ path: 'abc.js' }]
          },
          packages: {
            bootstrap: {
              links: ['def.css'],
              scripts: { path: 'def.js' }
            }
          }
        };
        const testOptions = [
          { ...baseOptions, append: false },
          { ...baseOptions, append: true }
        ];
        const addedLinkCount = 2;
        const addedScriptCount = 2;
        const expectedLinkCount = 1 + addedLinkCount;
        const expetedScriptCount = 2 + addedScriptCount;

        testOptions.forEach(options => {
          const expectedLinkIndex = options.append ? expectedLinkCount - addedLinkCount : 0;
          const expectedScriptIndex = options.append ? expetedScriptCount - addedScriptCount : 0;
          it(`applies append ${options.append}`, done => {
            webpack(createWebpackConfig({ options }), (err, result) => {
              expect(err).toBeFalsy();
              expect(JSON.stringify(result.compilation.errors)).toBe('[]');

              cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
                expect(links.length).toBe(expectedLinkCount);
                expect(scripts.length).toBe(expetedScriptCount);
                expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
                expect(links[expectedLinkIndex]).toBeTag({ tagName: 'link', attributes: { 'href': 'assets/abc.css', 'rel': 'stylesheet' } });
                expect(links[expectedLinkIndex + 1]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/def.css', 'rel': 'stylesheet' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
                expect(scripts[expectedScriptIndex]).toBeTag({ tagName: 'script', attributes: { 'src': 'assets/abc.js', 'type': 'text/javascript' } });
                expect(scripts[expectedScriptIndex + 1]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/def.js', 'type': 'text/javascript' } });

                done();
              });
            });
          });
        });
      });

      describe('assets level', () => {
        const baseAssets = {
          links: 'abc.css',
          scripts: [{ path: 'abc.js' }]
        };
        const testOptions = [
          { assets: { ...baseAssets, append: true }, append: false },
          { assets: { ...baseAssets, append: false }, append: true }
        ];
        const addedLinkCount = 1;
        const addedScriptCount = 1;
        const expectedLinkCount = 1 + addedLinkCount;
        const expetedScriptCount = 2 + addedScriptCount;

        testOptions.forEach(options => {
          const expectedLinkIndex = options.assets.append ? expectedLinkCount - addedLinkCount : 0;
          const expectedScriptIndex = options.assets.append ? expetedScriptCount - addedScriptCount : 0;
          it(`applies assets.append ${options.assets.append}`, done => {
            webpack(createWebpackConfig({ options }), (err, result) => {
              expect(err).toBeFalsy();
              expect(JSON.stringify(result.compilation.errors)).toBe('[]');

              cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts, data }) => {
                expect(links.length).toBe(expectedLinkCount);
                expect(scripts.length).toBe(expetedScriptCount);
                expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
                expect(links[expectedLinkIndex]).toBeTag({ tagName: 'link', attributes: { 'href': 'assets/abc.css', 'rel': 'stylesheet' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
                expect(scripts[expectedScriptIndex]).toBeTag({ tagName: 'script', attributes: { 'src': 'assets/abc.js', 'type': 'text/javascript' } });

                done();
              });
            });
          });
        });
      });

      describe('packages level', () => {
        const basePackage = {
          links: 'abc.css',
          scripts: [{ path: 'abc.js' }]
        };
        const testOptions = [
          { packages: { 'bootstrap': { ...basePackage, append: true } }, append: false },
          { packages: { 'bootstrap': { ...basePackage, append: false } }, append: true }
        ];
        const addedLinkCount = 1;
        const addedScriptCount = 1;
        const expectedLinkCount = 1 + addedLinkCount;
        const expetedScriptCount = 2 + addedScriptCount;

        testOptions.forEach(options => {
          const expectedLinkIndex = options.packages.bootstrap.append ? expectedLinkCount - addedLinkCount : 0;
          const expectedScriptIndex = options.packages.bootstrap.append ? expetedScriptCount - addedScriptCount : 0;
          it(`applies assets.append ${options.packages.bootstrap.append}`, done => {
            webpack(createWebpackConfig({ options }), (err, result) => {
              expect(err).toBeFalsy();
              expect(JSON.stringify(result.compilation.errors)).toBe('[]');

              cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts, data }) => {
                expect(links.length).toBe(expectedLinkCount);
                expect(scripts.length).toBe(expetedScriptCount);
                expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
                expect(links[expectedLinkIndex]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/abc.css', 'rel': 'stylesheet' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
                expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
                expect(scripts[expectedScriptIndex]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/abc.js', 'type': 'text/javascript' } });

                done();
              });
            });
          });
        });
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
        expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });

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
        expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/my-packages/bootstrap-4.3.1/css`)).toBe(true);
        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'my-packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });

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

        expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
        expect(areEqualDirectories('../node_modules/bootstrap/dist/js', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/js`)).toBe(true);

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/js/bootstrap.bundle.min.js' } });

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
        expect(areEqualDirectories('../node_modules/bootstrap/dist/css', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/css`)).toBe(true);
        expect(areEqualDirectories('../node_modules/bootstrap/dist/js', `${OUTPUT_DIR}/packages/bootstrap-4.3.1/js`)).toBe(true);
        // expect(JSON.stringify(result.compilation.options.externals)).toBe('{"bootstrap":"Bootstrap"}');

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'https://unpkg.com/bootstrap@4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'https://unpkg.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(3);
          expect(scripts.length).toBe(4);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bootstrap@4.3.1/link-a', 'rel': 'stylesheet' } });
          expect(links[2]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/link-b', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/script-a' } });
          expect(scripts[3]).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bootstrap@4.3.1/script-b' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(5);
          expect(scripts.length).toBe(6);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bootstrap@4.3.1/link-a', 'rel': 'stylesheet' } });
          expect(links[2]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/link-b', 'rel': 'stylesheet' } });
          expect(links[3]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bulma-0.7.4/link-c', 'rel': 'stylesheet' } });
          expect(links[4]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bulma@0.7.4/link-d', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bootstrap-4.3.1/script-a' } });
          expect(scripts[3]).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bootstrap@4.3.1/script-b' } });
          expect(scripts[4]).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bulma@0.7.4/script-c' } });
          expect(scripts[5]).toBeTag({ tagName: 'script', attributes: { 'src': 'packages/bulma-0.7.4/script-d' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'https://mydomain.com/bootstrap@4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'https://mydomain.com/bootstrap@4.3.1/js/bootstrap.bundle.min.js' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(3);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://abc.com/bootstrap@4.3.1/style-a.css', 'rel': 'stylesheet' } });
          expect(links[2]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://abc.com/bootstrap@4.3.1/cdn-style-b.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'http://abc.com/bootstrap@4.3.1/cdn-script-a.js' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-fake-version/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'packages/bootstrap-4.3.1/css/bootstrap.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });

          done();
        });
      });
    });

    it('does not apply devPath for a tag when useCdn for the tag is true', done => {
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
              },
              scripts: {
                path: 'js/bootstrap.min.js',
                devPath: 'js/bootstrap.js'
              },
              useCdn: true,
              getCdnPath: (packageName, packageVersion, packagePath) => `http://mydomain.com/${packageName}@${packageVersion}/${packagePath}`
            }
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'http://mydomain.com/bootstrap@4.3.1/css/bootstrap.min.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'http://mydomain.com/bootstrap@4.3.1/js/bootstrap.min.js', 'type': 'text/javascript' } });

          done();
        });
      });
    });
  });

  describe('assets', () => {
    it('it copies files in the assets copy options', done => {
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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': '/public-path/style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { href: '/public-path/assets/the-href', rel: 'the-rel' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/style.js', 'type': 'text/javascript' } });

          done();
        });
      });
    });

    it('it includes assets scripts', done => {
      webpack(createWebpackConfig({
        webpackPublicPath: '/public-path/',
        options: {
          assets: {
            scripts: [
              {
                path: 'the-src',
                publicPath: true
              },
              {
                path: 'the-src2',
                publicPath: false
              }
            ]
          }
        }
      }), (err, result) => {
        expect(err).toBeFalsy();
        expect(JSON.stringify(result.compilation.errors)).toBe('[]');

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(1);
          expect(scripts.length).toBe(4);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': '/public-path/style.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': '/public-path/assets/the-src' } });
          expect(scripts[3]).toBeTag({ tagName: 'script', attributes: { 'src': 'assets/the-src2' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(2);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': '/public-path/style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { href: '/public-path/my-assets/the-href', rel: 'the-rel' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': '/public-path/style.js', 'type': 'text/javascript' } });

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

        cheerioLoadTags(OUPUT_HTML_FILE, ({ links, scripts }) => {
          expect(links.length).toBe(2);
          expect(scripts.length).toBe(3);
          expect(links).toContainTag({ tagName: 'link', attributes: { 'href': 'style.css', 'rel': 'stylesheet' } });
          expect(links[1]).toBeTag({ tagName: 'link', attributes: { 'href': 'assets/my-assets/foo.css', 'rel': 'stylesheet' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'app.js', 'type': 'text/javascript' } });
          expect(scripts).toContainTag({ tagName: 'script', attributes: { 'src': 'style.js', 'type': 'text/javascript' } });
          expect(scripts[2]).toBeTag({ tagName: 'script', attributes: { 'src': 'assets/my-assets/foo.js', 'type': 'text/javascript' } });

          done();
        });
      });
    });
  });
});
