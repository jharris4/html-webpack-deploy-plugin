/* eslint-env jasmine */
const path = require('path');
require('jasmine-expect');

const HtmlWebpackDeployPlugin = require('../');

const FIXTURES_PATH = path.join(__dirname, './fixtures');

describe('option validation', () => {
  it('should throw an error if no options are provided', done => {
    const theFunction = () => {
      return new HtmlWebpackDeployPlugin();
    };

    expect(theFunction).toThrowError(/(options should be an object)/);
    done();
  });

  it('should throw an error if the options are not an object', done => {
    const theFunction = () => {
      return new HtmlWebpackDeployPlugin('hello');
    };

    expect(theFunction).toThrowError(/(options should be an object)/);
    done();
  });

  it('should not throw an error if the options is an empty object', done => {
    const theFunction = () => {
      return new HtmlWebpackDeployPlugin({});
    };

    expect(theFunction).not.toThrowError();
    done();
  });

  describe('options.assets', () => {
    let savedCwd = process.cwd();
    beforeEach(done => {
      process.chdir(path.join(savedCwd, 'spec', 'fixtures'));
      done();
    });

    afterEach(done => {
      process.chdir(savedCwd);
      done();
    });

    it('should throw an error if the assets is not an object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: '123' });
      };
      expect(theFunction).toThrowError(/(options\.assets should be an object)/);
      done();
    });

    it('should throw an error if the assets is an empty object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: {} });
      };
      expect(theFunction).toThrowError(/(ptions.assets should be an object with a copy, links, or scripts property)/);
      done();
    });

    it('should not throw an error if there are assets with empty copy array', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { copy: [] } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error if there are assets with copy that is not an array or object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { copy: '123' } });
      };
      expect(theFunction).toThrowError(/(options.assets.copy should be an array or object)/);
      done();
    });

    it('should throw an error if there are assets with copy that is an object with non string from', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { copy: { from: 123, to: 'dest' } } });
      };
      expect(theFunction).toThrowError(/(options.assets.copy should be an object with string properties from & to)/);
      done();
    });

    it('should throw an error if there are assets with copy that is an object with non string to', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { copy: { from: 'src', to: 123 } } });
      };
      expect(theFunction).toThrowError(/(options.assets.copy should be an object with string properties from & to)/);
      done();
    });

    it('should not throw an error for an assets with copy that is an object with string from & to', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { copy: { from: 'src', to: 'dest' } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    runTestsForOption(['assets', 'links']);
    runTestsForOption(['assets', 'scripts']);

    it('should throw an error for assets with scripts that have a non-string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { scripts: { path: 'a-path', devPath: 123 } } });
      };
      expect(theFunction).toThrowError(/(options.assets.scripts object devPath should be a string)/);
      done();
    });

    it('should not throw an error for assets with scripts that have a string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { scripts: { path: 'a-path', devPath: 'dev-path' } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for assets with links that have a non-string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { links: { path: 'a-path', devPath: 123 } } });
      };
      expect(theFunction).toThrowError(/(options.assets.links object devPath should be a string)/);
      done();
    });

    it('should not throw an error for assets with links that have a string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ assets: { links: { path: 'a-path', devPath: 'dev-path' } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe('options.packages', () => {
    let savedCwd = process.cwd();
    beforeEach(done => {
      process.chdir(path.join(savedCwd, 'spec', 'fixtures'));
      done();
    });

    afterEach(done => {
      process.chdir(savedCwd);
      done();
    });

    it('should throw an error if the packages is not an object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: '123' });
      };
      expect(theFunction).toThrowError(/(options\.packages should be an object)/);
      done();
    });

    it('should throw an error if any of the packages is not an object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': 'abc' } });
      };
      expect(theFunction).toThrowError(/(options\.packages.the-package should be an object)/);
      done();
    });

    it('should not throw an error if the packages is an empty object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: {} });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error if there is an empty object package', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': {} } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package should be an object with a copy, links, or scripts property)/);
      done();
    });

    it('should not throw an error if there is an object package with empty copy array', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { copy: [] } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error if there is a package with copy that is not an array or object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { copy: '123' } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.copy should be an array or object)/);
      done();
    });

    it('should throw an error if there is a package with copy that is an object with non string from', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { copy: { from: 123, to: 'dest' } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.copy should be an object with string properties from & to)/);
      done();
    });

    it('should throw an error if there is a package with copy that is an object with non string to', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { copy: { from: 'src', to: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.copy should be an object with string properties from & to)/);
      done();
    });

    it('should not throw an error for a package that exists with copy that is an object with string from & to', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { copy: { from: 'src', to: 'dest' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for a package that does not exist', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'package-does-not-exist': { copy: { from: 'src', to: 'dest' } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.package-does-not-exist package path could not be found)/);
      done();
    });

    it('should throw an error for a package that does not have a version', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'no-version': { copy: { from: 'src', to: 'dest' } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.no-version package version could not be found)/);
      done();
    });

    it('should throw an error for a package that has a malformed package.json', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'bad-package': { copy: { from: 'src', to: 'dest' } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.bad-package package.json was malformed)/);
      done();
    });

    runTestsForOption(['packages', 'bootstrap', 'links']);
    runTestsForOption(['packages', 'bootstrap', 'scripts']);

    it('should throw an error for a package with scripts that are objects with string variableName and object external', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: {
          path: 'a-path',
          variableName: 'shortcutVariableName',
          external: {
            packageName: 'packageName',
            variableName: 'variableName'
          } } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.scripts object variableName and external cannot be used together)/);
      done();
    });

    it('should throw an error for a package with scripts that are objects with non string variableName', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', variableName: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.scripts object variableName should be a string)/);
      done();
    });

    it('should not throw an error for a package with scripts that are objects with string variableName', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', variableName: 'the-variable-name' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for a package with scripts that have a non-string cdnPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', cdnPath: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.scripts object cdnPath should be a string)/);
      done();
    });

    it('should not throw an error for a package with scripts that have a string cdnPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', cdnPath: 'cdn-path' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for a package with links that have a non-string cdnPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { links: { path: 'a-path', cdnPath: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.links object cdnPath should be a string)/);
      done();
    });

    it('should not throw an error for a package with links that have a string cdnPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { links: { path: 'a-path', cdnPath: 'cdn-path' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for a package with scripts that have a non-string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', devPath: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.scripts object devPath should be a string)/);
      done();
    });

    it('should not throw an error for a package with scripts that have a string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { scripts: { path: 'a-path', devPath: 'dev-path' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error for a package with links that have a non-string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { links: { path: 'a-path', devPath: 123 } } } });
      };
      expect(theFunction).toThrowError(/(options.packages.the-package.links object devPath should be a string)/);
      done();
    });

    it('should not throw an error for a package with links that have a string devPath', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: { 'the-package': { links: { path: 'a-path', devPath: 'dev-path' } } } });
      };
      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe('options.append', () => {
    it('should not throw an error if the append flag is not provided', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ });
      };

      expect(theFunction).not.toThrowError();
      done();
    });

    it('should throw an error if the append flag is not a boolean', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ append: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.append should be a boolean)/);
      done();
    });
  });

  describe('options.addAssetPath', () => {
    it('should throw an error if the addAssetPath is not a function', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ addAssetPath: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.addAssetPath should be a function)/);
      done();
    });

    it('should throw an error if the addAssetPath is not a function that returns a string', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ addAssetPath: () => null });
      };

      expect(theFunction).toThrowError(/(options.addAssetPath should be a function that returns a string)/);
      done();
    });
  });

  describe('options.addPackagePath', () => {
    it('should throw an error if the addPackagePath is not a function', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ addPackagePath: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.addPackagePath should be a function)/);
      done();
    });

    it('should throw an error if the addPackagePath is not a function that returns a string', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ addPackagePath: () => null });
      };

      expect(theFunction).toThrowError(/(options.addPackagePath should be a function that returns a string)/);
      done();
    });
  });

  describe('options.findPackagePath', () => {
    it('should throw an error if the findPackagePath is not a function', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ findPackagePath: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.findPackagePath should be a function)/);
      done();
    });

    it('should throw an error if the findPackagePath is not a function that returns a string', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ findPackagePath: () => null });
      };

      expect(theFunction).toThrowError(/(options.findPackagePath should be a function that returns a string)/);
      done();
    });
  });

  describe('options.useCdn', () => {
    it('should throw an error if the useCdn is not a boolean', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ useCdn: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.useCdn should be a boolean)/);
      done();
    });
  });

  describe('options.getCdnPath', () => {
    it('should throw an error if the getCdnPath is not a function', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ getCdnPath: 'hello' });
      };

      expect(theFunction).toThrowError(/(options.getCdnPath should be a function)/);
      done();
    });

    it('should throw an error if the getCdnPath is not a function that returns a string', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ getCdnPath: () => null });
      };

      expect(theFunction).toThrowError(/(options.getCdnPath should be a function that returns a string)/);
      done();
    });
  });
});

function runTestsForOption (optionNamePath) {
  const optionName = optionNamePath.join('.');
  const isScript = optionNamePath[optionNamePath.length - 1] === 'scripts';

  function createPlugin (value, pluginOptionsRoot = {}) {
    let pluginOptions = pluginOptionsRoot;
    optionNamePath.slice(0, optionNamePath.length - 1).forEach(pathName => {
      pluginOptions = pluginOptions[pathName] = {};
    });
    pluginOptions[optionNamePath[optionNamePath.length - 1]] = value;

    return new HtmlWebpackDeployPlugin(pluginOptionsRoot);
  }

  describe(`options.${optionName}`, () => {
    it(`should throw an error if the ${optionName} are not an array or string or object`, done => {
      const theFunction = () => {
        return createPlugin(123);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} should be a string, object, or array)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains objects and a boolean`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, false, { path: 'b' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} items must be an object or string)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains string and a boolean`, done => {
      const theFunction = () => {
        return createPlugin([`foo.js`, true, `bar.css`]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} items must be an object or string)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains strings and objects`, done => {
      const theFunction = () => {
        return createPlugin([`foo.js`, { path: `file.js` }, `bar.css`]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} path`, () => {
    it(`should throw an error if the ${optionName} contains an element that is an empty object`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, {}, { path: 'b' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object must have a string path property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with a non string path`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 123, type: 'js' }, { path: 'c.css' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object must have a string path property)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains elements that are all objects that have a path`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b' }, { path: 'c' }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} publicPath`, () => {
    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to string`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', publicPath: 'string' }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to object`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', publicPath: {} }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to number`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', publicPath: 0 }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to array`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', publicPath: [] }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains an element that is an object with publicPath set to true`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a', publicPath: true }, { path: 'b' }, { path: 'c' }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} attributes`, () => {
    it(`should throw an error if the ${optionName} contains an element that is an object with non object string attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', attributes: '' }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with array attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', attributes: [] }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with number attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', attributes: 0 }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with boolean attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', attributes: true }, { path: 'c' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains an element that is an object with empty object attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'a' }, { path: 'b', attributes: {} }, { path: 'c' }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} glob`, () => {
    it(`should throw an error if any of the ${optionName} options are objects with a glob property that is not a string`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a', glob: 123, type: 'js' }, 'bar']);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string glob property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with a globPath property that is not a string`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a', globPath: 123, type: 'js' }, 'bar']);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string glob property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with glob specified but globPath missing`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a-path', glob: 'withoutExtensions*' }, 'bar'], { append: false });
      };
      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string globPath property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with globPath specified but glob missing`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a-path', globPath: 'withoutExtensions*' }, 'bar'], { append: false });
      };
      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string glob property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with glob that does not match any files`, done => {
      const theFunction = () => {
        return createPlugin([{ path: 'assets/', globPath: FIXTURES_PATH, glob: 'nonexistant*.js' }, { path: 'assets/', globPath: FIXTURES_PATH, glob: 'nonexistant*.css' }], { append: true });
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object glob found no files)`));
      done();
    });
  });

  describe(`options.${optionName} sourcePath`, () => {
    it(`should throw an error if any of the ${optionName} options are objects with an sourcePath property that is not a string`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a', sourcePath: 123, type: 'js' }, 'bar']);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string sourcePath property)`));
      done();
    });
  });

  describe(`options.${optionName} external`, () => {
    it(`should throw an error if any of the ${optionName} options are objects with external property that is not an object`, done => {
      const theFunction = () => {
        return createPlugin(['foo', { path: 'a', external: 123 }, 'bar']);
      };
      if (isScript) {
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should be an object)`));
      } else {
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should not be used on non script tags)`));
      }
      done();
    });

    if (isScript) {
      it(`should not throw an error if any of the ${optionName} options are objects with valid external objects`, done => {
        const theFunction = () => {
          return createPlugin(['foo', { path: 'a', external: { packageName: 'a', variableName: 'A' } }, 'bar']);
        };
        expect(theFunction).not.toThrowError();
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that is an empty object`, done => {
        const theFunction = () => {
          return createPlugin(['foo', { path: 'a', external: { } }, 'bar']);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string packageName and variableName property)`));
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that has packageName but not variableName string properties`, done => {
        const theFunction = () => {
          return createPlugin(['foo', { path: 'a', external: { packageName: 'a' } }, 'bar']);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string variableName property)`));
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that has variableName but not packageName string properties`, done => {
        const theFunction = () => {
          return createPlugin(['foo', { path: 'a', external: { variableName: 'A' } }, 'bar']);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string packageName property)`));
        done();
      });
    }
  });
}
