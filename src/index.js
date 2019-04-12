const webpack = require("webpack");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const fs = require("fs");
const path = require("path");
const PATH_REGEXP_NAME = /\[name\]/gi;
const PATH_REGEXP_VERSION = /\[version\]/gi;

/*
const sample = {
  "assets": {
    "src/assets": "assets"
  },
  "links": [
    {
      rel: "icon",
      href: "assets/apple-touch-icon.png"
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "assets/favicon-32x32.png"
    },
    {
      rel: "mask-icon",
      href: "assets/safari-pinned-tab.svg",
      color: "#404040"
    }
  ],
  "packages": {
    "bootstrap": {
      "assets": {
        "dist/css": "css/",
        "dist/fonts": "fonts/"
      },
      "entries": [
        "css/bootstrap.min.css",
        "css/bootstrap-theme.min.css"
      ]
    }
  }
};
 */

function setPluginOptions (pluginOptions) {
  const copyList = [];
  const includeList = [];
  const append = pluginOptions.append !== undefined ? pluginOptions.append : false;
  const publicPath = pluginOptions.publicPath !== undefined ? pluginOptions.publicPath : true;

  const packagePath = pluginOptions.packagePath || 'node_modules';
  const outputPath = pluginOptions.outputPath || '[name]-[version]';

  const assetMap = pluginOptions.assets || {};
  const assetKeys = Object.keys(assetMap);
  assetKeys.forEach(function(assetKey) {
    copyList.push({
      from: path.join(process.cwd(), assetKey),
      to: assetMap[assetKey]
    });
  });

  const links = pluginOptions.links || [];

  const packageMap = pluginOptions.packages || {};
  const packageNames = Object.keys(packageMap);
  packageNames.forEach(function(packageName) {
    let packageConfig = packageMap[packageName];
    let packageOutputPath = packageConfig.outputPath ? packageConfig.outputPath : outputPath;
    let packageVersion = 'no_version';
    let packageFilePath = path.join(process.cwd(), packagePath, packageName, 'package.json');
    try {
      let packageNpmPackage = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
      packageVersion = packageNpmPackage ? packageNpmPackage.version : "no_version";
    }
    catch (error) {
      throw new Error('Could not find package.json while trying to deploy assets for package named: ' + packageName + ' - ' + packageFilePath);
    }
    packageOutputPath = packageOutputPath.replace(PATH_REGEXP_NAME, packageName);
    packageOutputPath = packageOutputPath.replace(PATH_REGEXP_VERSION, packageVersion);

    const packageAssets = packageConfig.assets || {};
    const packageAssetKeys = Object.keys(packageAssets);
    packageAssetKeys.forEach(function(packageAssetKey) {
      copyList.push({
        from: path.join(process.cwd(), packagePath, packageName, packageAssetKey),
        to: path.join(packageOutputPath, packageAssets[packageAssetKey])
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
    includeList,
    links
  };
}

class HtmlWebpackDeployAssetsPlugin {
  constructor (pluginOptions = {}) {
    Object.assign(this, setPluginOptions(pluginOptions))
  }

  apply (compiler) {
    new CopyWebpackPlugin(this.copyList).apply(compiler);
    new HtmlWebpackIncludeAssetsPlugin({ assets: this.includeList, links: this.links, append: this.append, publicPath: this.publicPath }).apply(compiler);
  }
}
module.exports = HtmlWebpackDeployAssetsPlugin;