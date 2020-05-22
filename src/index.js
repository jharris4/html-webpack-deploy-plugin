'use strict';
const path = require('path');
const fs = require('fs');

const assert = require('assert');
const findUp = require('find-up');
const slash = require('slash'); // fixes slashes in file paths for windows
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');

const PLUGIN_NAME = 'HtmlWebpackDeployPlugin';

const { getValidatedOptions, IS } = HtmlWebpackTagsPlugin.api;

const DEFAULT_ROOT_OPTIONS = {
  assets: {},
  packages: {},
  useAssetsPath: true,
  addAssetsPath: assetPath => path.join('assets', assetPath),
  usePackagesPath: true,
  addPackagesPath: packagePath => path.join('packages', packagePath),
  getPackagePath: (packageName, packageVersion, packagePath) => path.join(packageName + '-' + packageVersion, packagePath),
  findNodeModulesPath: (cwd, packageName) => findUp.sync(slash(path.join('node_modules', packageName)), { cwd, type: 'directory' })
};

const DEFAULT_MAIN_OPTIONS = {
  useCdn: false,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
};

const { isDefined, isArray, isObject, isString, isBoolean, isFunction } = IS;

const isFunctionReturningString = v => isFunction(v) && isString(v('', '', '')); // 3rd string needed or this throws

const isArrayOfString = v => isArray(v) && v.every(i => isString(i));

const processShortcuts = (options, optionPath, keyShortcut, keyUse, keyAdd) => {
  const processedOptions = {};
  if (isDefined(options[keyUse]) || isDefined(options[keyAdd])) {
    assert(!isDefined(options[keyShortcut]), `${optionPath}.${keyShortcut} should not be used with either ${keyUse} or ${keyAdd}`);
    if (isDefined(options[keyUse])) {
      assert(isBoolean(options[keyUse]), `${optionPath}.${keyUse} should be a boolean`);
      processedOptions[keyUse] = options[keyUse];
    }
    if (isDefined(options[keyAdd])) {
      assert(isFunctionReturningString(options[keyAdd]), `${optionPath}.${keyAdd} should be a function that returns a string`);
      processedOptions[keyAdd] = options[keyAdd];
    }
  } else if (isDefined(options[keyShortcut])) {
    const shortcut = options[keyShortcut];
    assert(isBoolean(shortcut) || isString(shortcut) || isFunctionReturningString(shortcut),
      `${optionPath}.${keyShortcut} should be a boolean or a string or a function that returns a string`);
    if (isBoolean(shortcut)) {
      processedOptions[keyUse] = shortcut;
    } else if (isString(shortcut)) {
      processedOptions[keyUse] = true;
      processedOptions[keyAdd] = thePath => path.join(shortcut, thePath);
    } else {
      processedOptions[keyUse] = true;
      processedOptions[keyAdd] = shortcut;
    }
  }
  return processedOptions;
};

const getGroupLevelOptions = (options, optionPath, defaultOptions = {}) => {
  if (isObject(options)) {
    const { assets, packages, ...otherOptions } = options;
    return getValidatedOptions(otherOptions, optionPath, defaultOptions);
  } else {
    return getValidatedOptions(options, optionPath, defaultOptions);
  }
};

const getTagsLevelOptions = (options, optionPath, useFromAbsolute = false) => {
  assert(!(isObject(options) && isDefined(options.tags)), `${optionPath}.tags is not supported`);
  const validatedOptions = getValidatedOptions(options, optionPath, {});
  if (isDefined(validatedOptions.copy)) {
    const { copy } = validatedOptions;
    assert(isArray(copy) || isObject(copy), `${optionPath}.copy should be an object or array of objects`);
    if (isObject(copy)) {
      assert(isString(copy.from) && isString(copy.to), `${optionPath}.copy should be an object with string properties from & to`);
      if (useFromAbsolute && isDefined(copy.fromAbsolute)) {
        assert(isBoolean(copy.fromAbsolute), `${optionPath}.copy.fromAbsolute should be a boolean`);
      }
      validatedOptions.copy = [copy];
    } else {
      const copyList = [];
      copy.forEach(copyItem => {
        assert(isObject(copyItem), `${optionPath}.copy should be an array of objects`);
        assert(isString(copyItem.from) && isString(copyItem.to), `${optionPath}.copy should be an array of objects with string properties from & to`);
        copyList.push(copyItem);
      });
      validatedOptions.copy = copyList;
    }
  }
  return validatedOptions;
};

const getValidatedMainOptions = (options, optionPath, defaultMainOptions) => {
  return getValidatedCdnOptions(getGroupLevelOptions(options, optionPath, defaultMainOptions), optionPath);
};

const getValidatedRootOptions = (options, optionPath, defaultRootOptions = DEFAULT_ROOT_OPTIONS, defaultMainOptions = DEFAULT_MAIN_OPTIONS) => {
  const validatedRootOptions = {
    ...defaultRootOptions
  };
  const validatedMainOptions = getValidatedMainOptions(options, optionPath, defaultMainOptions);
  const { assets, packages, files, getPackagePath, findNodeModulesPath, prependExternals } = options;

  const assetsPathOptions = processShortcuts(options, optionPath, 'assetsPath', 'useAssetsPath', 'addAssetsPath');
  if (isDefined(assetsPathOptions.useAssetsPath)) {
    validatedRootOptions.useAssetsPath = assetsPathOptions.useAssetsPath;
  }
  if (isDefined(assetsPathOptions.addAssetsPath)) {
    validatedRootOptions.addAssetsPath = assetsPathOptions.addAssetsPath;
  }
  const packagesPathOptions = processShortcuts(options, optionPath, 'packagesPath', 'usePackagesPath', 'addPackagesPath');
  if (isDefined(packagesPathOptions.usePackagesPath)) {
    validatedRootOptions.usePackagesPath = packagesPathOptions.usePackagesPath;
  }
  if (isDefined(packagesPathOptions.addPackagesPath)) {
    validatedRootOptions.addPackagesPath = packagesPathOptions.addPackagesPath;
  }
  if (isDefined(getPackagePath)) {
    assert(isFunctionReturningString(getPackagePath), `${optionPath}.getPackagePath should be a function that returns a string`);
    validatedRootOptions.getPackagePath = getPackagePath;
  }
  if (isDefined(findNodeModulesPath)) {
    assert(isFunctionReturningString(findNodeModulesPath), `${optionPath}.findNodeModulesPath should be a function that returns a string`);
    validatedRootOptions.findNodeModulesPath = findNodeModulesPath;
  }
  if (isDefined(prependExternals)) {
    assert(isBoolean(prependExternals), `${optionPath}.prependExternals should be a boolean`);
    validatedRootOptions.prependExternals = prependExternals;
  }
  if (isDefined(files)) {
    assert((isString(files) || isArrayOfString(files)), `${optionPath}.files should be a string or array of strings`);
    validatedRootOptions.files = files;
  }
  if (isDefined(assets)) {
    validatedRootOptions.assets = getValidatedAssetsOptions(assets, validatedRootOptions, validatedMainOptions, `${optionPath}.assets`);
  }
  if (isDefined(packages)) {
    validatedRootOptions.packages = getValidatedPackagesOptions(packages, validatedRootOptions, validatedMainOptions, `${optionPath}.packages`);
  }

  return validatedRootOptions;
};

const getValidatedAssetsOptions = (assets, rootOptions, mainOptions, optionPath) => {
  const validatedAssets = getTagsLevelOptions(assets, optionPath);
  const { useAssetsPath, addAssetsPath } = rootOptions;
  const { copy, links, scripts, ...assetsOptions } = validatedAssets;

  const baseOptions = { ...mainOptions, ...assetsOptions };

  const addTagAssetsPaths = (tag, optionName) => {
    const newTag = {
      ...baseOptions,
      ...tag,
      path: useAssetsPath ? addAssetsPath(tag.path) : tag.path
    };
    if (isDefined(tag.devPath)) {
      assert(isString(tag.devPath), `${optionPath}.${optionName}.devPath should be a string`);
      newTag.devPath = useAssetsPath ? addAssetsPath(tag.devPath) : tag.devPath;
    }
    return newTag;
  };
  const getAddTagAssetsPaths = optionName => tag => addTagAssetsPaths(tag, optionName);
  if (isDefined(copy)) {
    validatedAssets.copy = copy.map(copy => ({ ...copy, to: useAssetsPath ? addAssetsPath(copy.to) : copy.to }));
  }
  if (isDefined(links)) {
    validatedAssets.links = links.map(getAddTagAssetsPaths('links'));
  }
  if (isDefined(scripts)) {
    validatedAssets.scripts = scripts.map(getAddTagAssetsPaths('scripts'));
  }
  return validatedAssets;
};

const getValidatedCdnOptions = (options, optionPath, defaultOptions = {}) => {
  const { useCdn, getCdnPath, ...otherOptions } = options;
  const validatedOptions = {
    ...defaultOptions,
    ...otherOptions
  };
  if (isDefined(useCdn)) {
    assert(isBoolean(useCdn), `${optionPath}.useCdn should be a boolean`);
    validatedOptions.useCdn = useCdn;
  }
  if (isDefined(getCdnPath)) {
    assert(isFunctionReturningString(getCdnPath), `${optionPath}.getCdnPath should be a function that returns a string`);
    validatedOptions.getCdnPath = getCdnPath;
  }
  return validatedOptions;
};

const getValidatedPackagesOptions = (packages, rootOptions, mainOptions, optionPath) => {
  assert(isObject(packages), `${optionPath} should be an object`);
  const validatedPackages = {};
  Object.keys(packages).forEach(packageName => {
    validatedPackages[packageName] = getValidatedPackageOptions(packages[packageName], packageName, rootOptions, mainOptions, optionPath);
  });
  return validatedPackages;
};

const getValidatedPackageOptions = (thePackage, packageName, rootOptions, mainOptions, optionPath) => {
  optionPath = `${optionPath}.${packageName}`;
  const validatedPackage = getValidatedCdnOptions(getTagsLevelOptions(thePackage, optionPath, true), optionPath, mainOptions);
  const { copy, links, scripts, ...packageOptions } = validatedPackage;
  const { findNodeModulesPath, getPackagePath, usePackagesPath, addPackagesPath } = rootOptions;
  const packagePath = findNodeModulesPath(process.cwd(), packageName);
  assert(isString(packagePath), `${optionPath} package path could not be found`);
  const packageFilePath = path.join(packagePath, 'package.json');
  let packageNpmPackage;
  try {
    packageNpmPackage = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
  } catch (error) {
    assert(false, `${optionPath} package.json not found in ${packageFilePath}`);
  }
  assert(isObject(packageNpmPackage), `${optionPath} package.json was malformed: ${packageFilePath}/package.json`);
  const packageVersion = packageNpmPackage.version;
  assert(isString(packageNpmPackage.version), `${optionPath} package version could not be found`);

  validatedPackage.version = packageNpmPackage.version;

  // always copy even when using cdn
  if (isDefined(copy)) {
    const processCopyItem = copyItem => {
      let { fromAbsolute = false, from, to, ...otherOptions } = copyItem;
      to = getPackagePath(packageName, packageVersion, to);
      to = usePackagesPath ? addPackagesPath(to) : to;
      from = fromAbsolute ? from : path.join(packagePath, from);
      return {
        ...otherOptions,
        from,
        to
      };
    };
    validatedPackage.copy = copy.map(processCopyItem);
  }

  const applyExternal = script => {
    if (isDefined(script.variableName)) {
      assert(!isDefined(script.external), `${optionPath}.scripts object variableName and external cannot be used together`);
      const { variableName } = script;
      assert(isString(variableName), `${optionPath}.scripts object variableName should be a string`);
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

  const baseOptions = { ...mainOptions, ...packageOptions };

  const applyCdnDevPackagePath = (tag, optionName) => {
    const { useCdn, getCdnPath } = { ...baseOptions, ...getValidatedCdnOptions(tag, optionPath) };

    let cdnPath = tag.path;
    if (isDefined(tag.cdnPath)) {
      assert(isString(tag.cdnPath), `${optionPath}.${optionName}.cdnPath should be a string`);
      cdnPath = tag.cdnPath;
    }
    if (isDefined(tag.devPath)) {
      assert(isString(tag.devPath), `${optionPath}.${optionName}.devPath should be a string`);
    }
    let newTag = {
      ...validatedPackage,
      ...tag,
      packageName
    };
    if (useCdn) {
      newTag = {
        ...newTag,
        path: getCdnPath(packageName, packageVersion, cdnPath),
        publicPath: false,
        hash: false,
        useCdn: true
      };
    } else {
      const packagePath = getPackagePath(packageName, packageVersion, tag.path);
      newTag = {
        ...newTag,
        path: usePackagesPath ? addPackagesPath(packagePath) : packagePath
      };
      if (isDefined(tag.devPath)) {
        const devPackagePath = getPackagePath(packageName, packageVersion, tag.devPath);
        newTag.devPath = usePackagesPath ? addPackagesPath(devPackagePath) : devPackagePath;
      }
    }
    return newTag;
  };

  if (isDefined(links)) {
    validatedPackage.links = links.map(tag => applyCdnDevPackagePath(tag, 'links'));
  }
  if (isDefined(scripts)) {
    validatedPackage.scripts = scripts.map(tag => applyCdnDevPackagePath(tag, 'scripts'));
    validatedPackage.scripts = validatedPackage.scripts.map(applyExternal);
  }
  return validatedPackage;
};

function HtmlWebpackDeployPlugin (options) {
  const copyList = [];
  const linkList = [];
  const scriptList = [];
  const validatedOptions = getValidatedRootOptions(options, `${PLUGIN_NAME}.options`);
  const { assets, packages, files, prependExternals } = validatedOptions;
  const addSection = section => {
    const { copy, links, scripts } = section;
    if (isDefined(copy)) {
      copyList.push(...copy);
    }
    if (isDefined(links)) {
      linkList.push(...links);
    }
    if (isDefined(scripts)) {
      scriptList.push(...scripts);
    }
  };
  if (isDefined(assets)) {
    addSection(assets);
  }
  if (isDefined(packages)) {
    Object.keys(packages).forEach(packageName => {
      addSection(packages[packageName]);
    });
  }

  this.options = {
    copy: copyList,
    links: linkList,
    scripts: scriptList,
    files,
    prependExternals
  };
}

HtmlWebpackDeployPlugin.prototype.apply = function (compiler) {
  let { copy, links, scripts, files, prependExternals } = this.options;
  if (compiler.options.mode === 'development') {
    const applyDevPath = tag => {
      if (isDefined(tag.devPath) && !tag.useCdn) {
        tag = {
          ...tag,
          path: tag.devPath
        };
      }
      return tag;
    };

    links = links.map(applyDevPath);
    scripts = scripts.map(applyDevPath);
  }
  if (copy && (Array.isArray(copy) ? copy.length > 0 : true)) {
    new CopyWebpackPlugin({ patterns: copy }).apply(compiler);
  }
  new HtmlWebpackTagsPlugin({ links, scripts, files, prependExternals }).apply(compiler);
};

module.exports = HtmlWebpackDeployPlugin;
