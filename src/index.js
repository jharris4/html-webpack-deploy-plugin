'use strict';
const path = require('path');
const fs = require('fs');

const assert = require('assert');
const findUp = require('find-up');
const slash = require('slash'); // fixes slashes in file paths for windows
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');

const PLUGIN_NAME = 'HtmlWebpackDeployPlugin';

const DEFAULT_OPTIONS = {
  append: false,
  assets: {},
  packages: {},
  addAssetPath: assetPath => path.join('assets', assetPath),
  addPackagePath: (packageName, packageVersion, packagePath) => path.join('packages', packageName + '-' + packageVersion, packagePath),
  findPackagePath: (cwd, packageName) => findUp.sync(slash(path.join('node_modules', packageName)), { cwd }),
  useCdn: false,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
};

const TAGS_PASSTHROUGH_OPTIONS = [
  'append', 'useHash', 'addHash', 'usePublicPath', 'addPublicPath'
];

function isDefined (v) {
  return v !== void 0;
}

function isArray (v) {
  return Array.isArray(v);
}

function isObject (v) {
  return v !== null && v !== void 0 && typeof v === 'object' && !isArray(v);
}

function isString (v) {
  return v !== null && v !== void 0 && (typeof v === 'string' || v instanceof String);
}

function isBoolean (v) {
  return v === true || v === false;
}

function isFunction (v) {
  return typeof v === 'function';
}

// this function was only added to stop semistandard from complaining
function applyConstructor (Constructor, ...args) {
  return new Constructor(...args);
}

function checkForTagOptionErrors (tagOptions, optionName, packageName) {
  const errorName = packageName ? packageName + '.' + optionName : optionName;
  try {
    applyConstructor(HtmlWebpackTagsPlugin, { [optionName]: tagOptions });
    // new HtmlWebpackTagsPlugin({ [optionName]: tagOptions });
  } catch (err) {
    if (err.message.indexOf('HtmlWebpackTagsPlugin') !== -1) {
      const msg = err.message.replace(`HtmlWebpackTagsPlugin options.${optionName}`, '');
      throw new Error(`${PLUGIN_NAME} options.${errorName}${msg}`);
    } else {
      throw err;
    }
  }
}

function getTagObjects (tags, optionName, packageName) {
  assert(isString(tags) || isArray(tags) || isObject(tags), `${PLUGIN_NAME} options.${packageName}.${optionName} should be a string, object, or array`);
  checkForTagOptionErrors(tags, optionName, packageName);
  if (isString(tags)) {
    return [{ path: tags }];
  } else if (isObject(tags)) {
    return [tags];
  } else {
    return tags.map(tag => isString(tag) ? { path: tag } : tag);
  }
}

function getDeployObject (deployObject, packageName) {
  let copyList = [];
  let linksList = [];
  let scriptsList = [];
  const { copy, links, scripts } = deployObject;
  assert(isDefined(copy) || isDefined(links) || isDefined(scripts),
    `${PLUGIN_NAME} options.${packageName} should be an object with a copy, links, or scripts property`
  );
  if (isDefined(copy)) {
    assert(isArray(copy) || isObject(copy), `${PLUGIN_NAME} options.${packageName}.copy should be an array or object`);
    if (isObject(copy)) {
      assert(isString(copy.from) && isString(copy.to), `${PLUGIN_NAME} options.${packageName}.copy should be an object with string properties from & to`);
      copyList.push(copy);
    } else {
      copy.forEach(copyItem => {
        assert(isObject(copyItem), `${PLUGIN_NAME} options.${packageName}.copy should be an array of objects`);
        assert(isString(copyItem.from) && isString(copyItem.to), `${PLUGIN_NAME} options.${packageName}.copy should be an array of objects with string properties from & to`);
        copyList.push(copyItem);
      });
    }
  }
  if (isDefined(links)) {
    linksList = getTagObjects(links, 'links', packageName);
  }
  if (isDefined(scripts)) {
    scriptsList = getTagObjects(scripts, 'scripts', packageName);
  }
  return {
    copy: copyList,
    links: linksList,
    scripts: scriptsList
  };
}

function HtmlWebpackDeployPlugin (options) {
  assert(isObject(options), `${PLUGIN_NAME} options should be an object`);
  const copyList = [];
  const linkList = [];
  const scriptList = [];
  const tagsPassthroughOptions = {};
  if (isObject(options)) {
    let { assets, packages, addAssetPath, addPackagePath, findPackagePath, useCdn, getCdnPath } = DEFAULT_OPTIONS;

    TAGS_PASSTHROUGH_OPTIONS.forEach(optionName => {
      if (isDefined(options[optionName])) {
        checkForTagOptionErrors(options[optionName], optionName);
        tagsPassthroughOptions[optionName] = options[optionName];
      }
    });
    if (!isDefined(options.append)) {
      tagsPassthroughOptions.append = DEFAULT_OPTIONS.append;
    }
    if (isDefined(options.addAssetPath)) {
      assert(isFunction(options.addAssetPath), `${PLUGIN_NAME} options.addAssetPath should be a function`);
      assert(isString(options.addAssetPath('')), `${PLUGIN_NAME} options.addAssetPath should be a function that returns a string`);
      addAssetPath = options.addAssetPath;
    }
    if (isDefined(options.addPackagePath)) {
      assert(isFunction(options.addPackagePath), `${PLUGIN_NAME} options.addPackagePath should be a function`);
      assert(isString(options.addPackagePath('', '', '')), `${PLUGIN_NAME} options.addPackagePath should be a function that returns a string`);
      addPackagePath = options.addPackagePath;
    }
    if (isDefined(options.findPackagePath)) {
      assert(isFunction(options.findPackagePath), `${PLUGIN_NAME} options.findPackagePath should be a function`);
      assert(isString(options.findPackagePath('', '')), `${PLUGIN_NAME} options.findPackagePath should be a function that returns a string`);
      findPackagePath = options.findPackagePath;
    }
    if (isDefined(options.useCdn)) {
      assert(isBoolean(options.useCdn), `${PLUGIN_NAME} options.useCdn should be a boolean`);
      useCdn = options.useCdn;
    }
    if (isDefined(options.getCdnPath)) {
      assert(isFunction(options.getCdnPath), `${PLUGIN_NAME} options.getCdnPath should be a function`);
      assert(isString(options.getCdnPath('', '', '')), `${PLUGIN_NAME} options.getCdnPath should be a function that returns a string`);
      getCdnPath = options.getCdnPath;
    }

    if (isDefined(options.assets)) {
      assert(isObject(options.assets), `${PLUGIN_NAME} options.assets should be an object`);
      assets = getDeployObject(options.assets, 'assets');
      assets.copy = assets.copy.map(copy => ({ ...copy, to: addAssetPath(copy.to) }));
      assets.links = assets.links.map(link => ({ ...link, path: addAssetPath(link.path) }));
      assets.scripts = assets.scripts.map(script => ({ ...script, path: addAssetPath(script.path) }));
      copyList.push(...assets.copy);
      linkList.push(...assets.links);
      scriptList.push(...assets.scripts);
    }

    if (isDefined(options.packages)) {
      const { packages: optionPackages } = options;
      assert(isObject(optionPackages), `${PLUGIN_NAME} options.packages should be an object`);
      packages = {};
      Object.keys(optionPackages).forEach(packageName => {
        // TODO - if the external.packageName is missing this will throw. so we cannot call the option external like: { external: 'the-variable-name' }
        const packageAssets = getDeployObject(optionPackages[packageName], 'packages.' + packageName);
        packages[packageName] = packageAssets;

        const packagePath = findPackagePath(process.cwd(), packageName);
        const packageFilePath = path.join(packagePath, 'package.json');
        let packageVersion = 'no_version';
        try {
          let packageNpmPackage = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
          packageVersion = packageNpmPackage ? packageNpmPackage.version : 'no_version';
        } catch (error) {
          assert(false, `${PLUGIN_NAME} options.packages.${packageName} package.json not found in ${packageFilePath}`);
        }

        // always copy even when using cdn
        packageAssets.copy = packageAssets.copy.map(copy => ({
          ...copy,
          from: path.join(packagePath, copy.from),
          to: addPackagePath(packageName, packageVersion, copy.to)
        }));

        const applyCdn = (tag, optionName) => {
          let localUseCdn = useCdn;
          let localGetCdnPath = getCdnPath;
          if (isDefined(tag.useCdn)) {
            assert(isBoolean(tag.useCdn), `${PLUGIN_NAME} options.packages.${packageName}.${optionName} object useCdn should be a boolean`);
            localUseCdn = tag.useCdn;
          }
          if (isDefined(tag.getCdnPath)) {
            assert(isFunction(tag.getCdnPath), `${PLUGIN_NAME} options.packages.${packageName}.${optionName} object getCdnPath should be a function`);
            assert(isString(tag.getCdnPath('', '', '')), `${PLUGIN_NAME} options.packages.${packageName}.${optionName} object getCdnPath should be a function that returns a string`);
            localGetCdnPath = tag.getCdnPath;
          }
          if (localUseCdn) {
            tag = {
              ...tag,
              path: localGetCdnPath(packageName, packageVersion, tag.path),
              publicPath: false,
              hash: false
            };
          } else {
            tag = {
              ...tag,
              path: addPackagePath(packageName, packageVersion, tag.path)
            };
          }
          return tag;
        };

        packageAssets.links = packageAssets.links.map(tag => applyCdn(tag, 'links'));
        packageAssets.scripts = packageAssets.scripts.map(tag => applyCdn(tag, 'scripts'));

        const applyExternal = script => {
          if (isDefined(script.variableName)) {
            assert(!isDefined(script.external), `${PLUGIN_NAME} options.packages.${packageName}.scripts object variableName and external cannot be used together`);
            const { variableName } = script;
            assert(isString(variableName), `${PLUGIN_NAME} options.packages.${packageName}.scripts object variableName should be a string`);
            script = {
              ...script,
              external: {
                packageName,
                variableName
              }
            };
          }
          return script;
        };

        packageAssets.scripts = packageAssets.scripts.map(applyExternal);

        copyList.push(...packageAssets.copy);
        linkList.push(...packageAssets.links);
        scriptList.push(...packageAssets.scripts);
      });
    }

    this.options = {
      assets,
      packages,
      copy: copyList,
      links: linkList,
      scripts: scriptList,
      tagsPassthroughOptions
    };
  }
}

HtmlWebpackDeployPlugin.prototype.apply = function (compiler) {
  new CopyWebpackPlugin(this.options.copy).apply(compiler);
  new HtmlWebpackTagsPlugin({ ...this.options.tagsPassthroughOptions, links: this.options.links, scripts: this.options.scripts }).apply(compiler);
};

module.exports = HtmlWebpackDeployPlugin;
