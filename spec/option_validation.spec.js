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

  describe('options.packages', () => {
    it('should throw an error if the packages is not an object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: '123' });
      };
      expect(theFunction).toThrowError(/(options\.packages should be an object)/);
      done();
    });

    it('should not throw an error if the packages in an empty object', done => {
      const theFunction = () => {
        return new HtmlWebpackDeployPlugin({ packages: {} });
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

  describe('options[links|scripts]', () => {
    runTestsForOption(['assets', 'links']);
    runTestsForOption(['assets', 'scripts']);
    runTestsForOption(['packages', 'bootstrap', 'links']);
    runTestsForOption(['packages', 'bootstrap', 'scripts']);
  });
});

function runTestsForOption (optionNamePath) {
  const optionName = optionNamePath.join('.');
  const isScript = optionNamePath[optionNamePath.length - 1] === 'scripts';
  const ext = isScript ? '.js' : '.css'; // TODO the ext was copied from tags plugin and isn't needed but does no harm...

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
        return createPlugin([{ path: `a${ext}` }, false, { path: `b${ext}` }]);
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
        return createPlugin([{ path: `a${ext}` }, {}, { path: `b${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object must have a string path property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with a non string path`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: 123, type: 'js' }, { path: 'c.css' }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object must have a string path property)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains elements that are all objects that have a path`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}` }, { path: `c${ext}` }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} publicPath`, () => {
    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to string`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, publicPath: 'string' }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to object`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, publicPath: {} }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to number`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, publicPath: 0 }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with publicPath set to array`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, publicPath: [] }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object publicPath should be a boolean or function)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains an element that is an object with publicPath set to true`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}`, publicPath: true }, { path: `b${ext}` }, { path: `c${ext}` }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} attributes`, () => {
    it(`should throw an error if the ${optionName} contains an element that is an object with non object string attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, attributes: '' }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with array attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, attributes: [] }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with number attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, attributes: 0 }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should throw an error if the ${optionName} contains an element that is an object with boolean attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, attributes: true }, { path: `c${ext}` }]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have an object attributes property)`));
      done();
    });

    it(`should not throw an error if the ${optionName} contains an element that is an object with empty object attributes`, done => {
      const theFunction = () => {
        return createPlugin([{ path: `a${ext}` }, { path: `b${ext}`, attributes: {} }, { path: `c${ext}` }]);
      };

      expect(theFunction).not.toThrowError();
      done();
    });
  });

  describe(`options.${optionName} glob`, () => {
    it(`should throw an error if any of the ${optionName} options are objects with a glob property that is not a string`, done => {
      const theFunction = () => {
        return createPlugin([`foo${ext}`, { path: `a${ext}`, glob: 123, type: 'js' }, `bar${ext}`]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string glob property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with a globPath property that is not a string`, done => {
      const theFunction = () => {
        return createPlugin([`foo${ext}`, { path: `a${ext}`, globPath: 123, type: 'js' }, `bar${ext}`]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string glob property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with glob specified but globPath missing`, done => {
      const theFunction = () => {
        return createPlugin([`foo${ext}`, { path: `pathWithExtension${ext}`, glob: 'withoutExtensions*' }, `bar${ext}`], { append: false });
      };
      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string globPath property)`));
      done();
    });

    it(`should throw an error if any of the ${optionName} options are objects with globPath specified but glob missing`, done => {
      const theFunction = () => {
        return createPlugin([`foo${ext}`, { path: `pathWithExtension${ext}`, globPath: 'withoutExtensions*' }, `bar${ext}`], { append: false });
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
        return createPlugin([`foo${ext}`, { path: `a${ext}`, sourcePath: 123, type: 'js' }, `bar${ext}`]);
      };

      expect(theFunction).toThrowError(new RegExp(`(options.${optionName} object should have a string sourcePath property)`));
      done();
    });
  });

  describe(`options.${optionName} external`, () => {
    it(`should throw an error if any of the ${optionName} options are objects with external property that is not an object`, done => {
      const theFunction = () => {
        return createPlugin([`foo${ext}`, { path: `a${ext}`, external: 123 }, `bar${ext}`]);
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
          return createPlugin([`foo${ext}`, { path: `a${ext}`, external: { packageName: 'a', variableName: 'A' } }, `bar${ext}`]);
        };
        expect(theFunction).not.toThrowError();
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that is an empty object`, done => {
        const theFunction = () => {
          return createPlugin([`foo${ext}`, { path: `a${ext}`, external: { } }, `bar${ext}`]);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string packageName and variableName property)`));
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that has packageName but not variableName string properties`, done => {
        const theFunction = () => {
          return createPlugin([`foo${ext}`, { path: `a${ext}`, external: { packageName: 'a' } }, `bar${ext}`]);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string variableName property)`));
        done();
      });

      it(`should throw an error if any of the ${optionName} options are objects with external that has variableName but not packageName string properties`, done => {
        const theFunction = () => {
          return createPlugin([`foo${ext}`, { path: `a${ext}`, external: { variableName: 'A' } }, `bar${ext}`]);
        };
        expect(theFunction).toThrowError(new RegExp(`(options.${optionName} external should have a string packageName property)`));
        done();
      });
    }
  });
}
