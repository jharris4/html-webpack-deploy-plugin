const webpack = require("webpack");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const path = require("path");
const PATH_REGEXP_NAME = /\[name\]/gi;
const PATH_REGEXP_VERSION = /\[version\]/gi;

function setPluginOptions (pluginOptions) {
  const copyList = [];
  const includeList = [];
  const append = pluginOptions.append !== undefined ? pluginOptions.append : false;
  const publicPath = pluginOptions.publicPath !== undefined ? pluginOptions.publicPath : true;

  const packagePath = pluginOptions.packagePath || 'node_modules';
  const outputPath = pluginOptions.outputPath || '[name]-[version]';

  const packageMap = pluginOptions.packages || {};
  const packageNames = Object.keys(packageMap);
  packageNames.forEach(function(packageName) {
    let packageConfig = packageMap[packageName];
    let packageOutputPath = packageConfig.outputPath ? packageConfig.outputPath : outputPath;
    let packageVersion = 'no_version';
    try {
      let packageNpmPackage = require('./' + path.join(packagePath, packageName, 'package'));
      packageVersion = packageNpmPackage ? packageNpmPackage.version : "no_version";
    }
    catch (error) {
      throw new Error('Could not find package.json while trying to deploy assets for package named: ' + packageName);
    }
    packageOutputPath = packageOutputPath.replace(PATH_REGEXP_NAME, packageName);
    packageOutputPath = packageOutputPath.replace(PATH_REGEXP_VERSION, packageVersion);

    const assets = packageConfig.assets || {};
    const assetKeys = Object.keys(assets);
    assetKeys.forEach(function(assetKey) {
      copyList.push({
        from: path.resolve(__dirname, path.join(packagePath, packageName, assetKey)),
        to: path.join(packageOutputPath, assets[assetKey])
      });
    });

    const entries = packageConfig.entries || [];
    entries.forEach(function(entry) {
      includeList.push(path.join(packageOutputPath, entry));
    });
  });

  return {
    append,
    publicPath,
    copyList,
    includeList
  };
}

class HtmlWebpackDeployAssetsPlugin {
  constructor (pluginOptions = {}) {
    Object.assign(this, setPluginOptions(pluginOptions))
  }

  apply (compiler) {
    compiler.apply(
      new CopyWebpackPlugin(this.copyList),
      new HtmlWebpackIncludeAssetsPlugin({ assets: this.includeList, append: this.append, publicPath: this.publicPath })
    );
  }
}
module.exports = HtmlWebpackDeployAssetsPlugin;