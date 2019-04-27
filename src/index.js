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
  useAssetPath: true,
  addAssetsPath: assetPath => path.join('assets', assetPath),
  usePackagePath: true,
  addPackagesPath: (packageName, packageVersion, packagePath) => path.join('packages', packageName + '-' + packageVersion, packagePath),
  findNodeModulesPath: (cwd, packageName) => findUp.sync(slash(path.join('node_modules', packageName)), { cwd })
};

const DEFAULT_MAIN_OPTIONS = {
  useCdn: false,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
};

const { isDefined, isArray, isObject, isString, isBoolean, isFunction } = IS;

const isFunctionReturningString = v => isFunction(v) && isString(v('', '', '')); // 3rd string needed or this throws

// TODO - processShortcuts copied verbatim from tags-plugin and perhaps should be made available through the api.
const processShortcuts = (options, optionPath, keyShortcut, keyUse, keyAdd, add) => {
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
      processedOptions[keyAdd] = path => add(path, shortcut);
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

const getTagsLevelOptions = (options, optionPath) => {
  assert(!(isObject(options) && isDefined(options.tags)), `${optionPath}.tags is not supported`);
  const validatedOptions = getValidatedOptions(options, optionPath, {});
  if (isDefined(validatedOptions.copy)) {
    const { copy } = validatedOptions;
    assert(isArray(copy) || isObject(copy), `${optionPath}.copy should be an object or array of objects`);
    if (isObject(copy)) {
      assert(isString(copy.from) && isString(copy.to), `${optionPath}.copy should be an object with string properties from & to`);
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
  const { assets, packages, findNodeModulesPath } = options;

  const assetsPathOptions = processShortcuts(options, optionPath, 'assetsPath', 'useAssetsPath', 'addAssetsPath', DEFAULT_ROOT_OPTIONS.addAssetsPath);
  if (isDefined(assetsPathOptions.useAssetsPath)) {
    validatedRootOptions.useAssetsPath = assetsPathOptions.useAssetsPath;
  }
  if (isDefined(assetsPathOptions.addAssetsPath)) {
    validatedRootOptions.addAssetsPath = assetsPathOptions.addAssetsPath;
  }
  const packagesPathOptions = processShortcuts(options, optionPath, 'packagesPath', 'usePackagesPath', 'addPackagesPath', DEFAULT_ROOT_OPTIONS.addPackagesPath);
  if (isDefined(packagesPathOptions.usePackagesPath)) {
    validatedRootOptions.usePackagesPath = packagesPathOptions.usePackagesPath;
  }
  if (isDefined(packagesPathOptions.addPackagesPath)) {
    validatedRootOptions.addPackagesPath = packagesPathOptions.addPackagesPath;
  }

  if (isDefined(findNodeModulesPath)) {
    assert(isFunctionReturningString(findNodeModulesPath), `${optionPath}.findNodeModulesPath should be a function that returns a string`);
    validatedRootOptions.findNodeModulesPath = findNodeModulesPath;
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
  const { addAssetsPath } = rootOptions;
  const { copy, links, scripts, ...assetsOptions } = validatedAssets;

  const baseOptions = { ...mainOptions, ...assetsOptions };

  // TODO - make sure the merging here is working properly
  const addAssetsPaths = (tag, optionName) => {
    const newTag = {
      ...baseOptions,
      ...tag,
      path: addAssetsPath(tag.path)
    };
    if (isDefined(tag.devPath)) {
      assert(isString(tag.devPath), `${optionPath}.${optionName}.devPath should be a string`);
      newTag.devPath = addAssetsPath(tag.devPath);
    }
    return newTag;
  };
  const getAddAssetsPaths = optionName => tag => addAssetsPaths(tag, optionName);
  if (isDefined(copy)) {
    validatedAssets.copy = copy.map(copy => ({ ...copy, to: addAssetsPath(copy.to) }));
  }
  if (isDefined(links)) {
    validatedAssets.links = links.map(getAddAssetsPaths('links'));
  }
  if (isDefined(scripts)) {
    validatedAssets.scripts = scripts.map(getAddAssetsPaths('scripts'));
  }
  return validatedAssets;
};

// TODO make sure cdnPath (and devPath) are properly validated

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
  const validatedPackage = getValidatedCdnOptions(getTagsLevelOptions(thePackage, optionPath), optionPath, mainOptions);
  const { copy, links, scripts, ...packageOptions } = validatedPackage;
  const { findNodeModulesPath, addPackagesPath } = rootOptions;
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
    validatedPackage.copy = copy.map(copyItem => ({
      ...copyItem,
      from: path.join(packagePath, copyItem.from),
      to: addPackagesPath(packageName, packageVersion, copyItem.to)
    }));
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

  // TODO - make sure cdn merging is working properly here
  const applyCdnDevPackagePath = (tag, optionName) => {
    let { useCdn, getCdnPath } = { ...baseOptions, ...getValidatedCdnOptions(tag, optionPath) };

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
      newTag = {
        ...newTag,
        path: addPackagesPath(packageName, packageVersion, tag.path)
      };
      if (isDefined(tag.devPath)) {
        newTag.devPath = addPackagesPath(packageName, packageVersion, tag.devPath);
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
  const { assets, packages } = validatedOptions;
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
    scripts: scriptList
  };
}

HtmlWebpackDeployPlugin.prototype.apply = function (compiler) {
  let { copy, links, scripts } = this.options;
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
  new CopyWebpackPlugin(copy).apply(compiler);
  new HtmlWebpackTagsPlugin({ links, scripts }).apply(compiler);
};

module.exports = HtmlWebpackDeployPlugin;
