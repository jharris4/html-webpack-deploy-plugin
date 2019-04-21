const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const fs = require('fs');
const path = require('path');

const PATH_REGEXP_NAME = /\[name\]/gi;
const PATH_REGEXP_VERSION = /\[version\]/gi;

/*
const sample = {
  copy: {
    "src/assets": "assets"
  },
  links: [
    {
      path: "assets/apple-touch-icon.png",
      attributes: {
        rel: "icon"
      }
    },
    {
      path: "assets/favicon-32x32.png",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32"
      }
    }
  ],
  packages: {
    "bootstrap": {
      copy: {
        "dist/css": "css/",
        "dist/fonts": "fonts/"
      },
      links: [
        "css/bootstrap.min.css",
        "css/bootstrap-theme.min.css"
      ]
    },
    "react": {
      copy: {
        "umd/react.production.min.js": "js/react.production.min.js"
      },
      script: {
        path: 'js/react.production.min.js,
        var: 'React'
      }
    }
  },
  packagesPath: 'node_modules'
};
 */

function setPluginOptions (pluginOptions) {
  const copyList = [];
  const includeList = [];
  const append = pluginOptions.append !== undefined ? pluginOptions.append : false;
  const publicPath = pluginOptions.publicPath !== undefined ? pluginOptions.publicPath : true;
  const useCdn = pluginOptions.useCdn !== undefined ? pluginOptions.useCdn : false;
  const cdnResolver = (useCdn && pluginOptions.cdnResolver !== undefined) ? pluginOptions.cdnResolver : null;

  const packagePath = pluginOptions.packagePath || 'node_modules';
  const outputPath = pluginOptions.outputPath || '[name]-[version]';

  const assetMap = pluginOptions.assets || {};
  const assetKeys = Object.keys(assetMap);
  assetKeys.forEach(assetKey => {
    copyList.push({
      from: path.join(process.cwd(), assetKey),
      to: assetMap[assetKey]
    });
  });

  const links = pluginOptions.links || [];

  const packageMap = pluginOptions.packages || {};
  const packageNames = Object.keys(packageMap);
  packageNames.forEach(packageName => {
    let packageConfig = packageMap[packageName];
    let packageVersion = 'no_version';
    let packageFilePath = path.join(process.cwd(), packagePath, packageName, 'package.json');
    try {
      let packageNpmPackage = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
      packageVersion = packageNpmPackage ? packageNpmPackage.version : 'no_version';
    } catch (error) {
      throw new Error('Could not find package.json while trying to deploy assets for package named: ' + packageName + ' - ' + packageFilePath);
    }

    if (packageConfig.cdnEntries && cdnResolver) {
      packageConfig.cdnEntries.forEach(function (cdnEntry) {
        includeList.push(cdnResolver({ name: packageName, version: packageVersion, path: cdnEntry }));
      });
    } else {
      let packageOutputPath = packageConfig.outputPath ? packageConfig.outputPath : outputPath;
      packageOutputPath = packageOutputPath.replace(PATH_REGEXP_NAME, packageName);
      packageOutputPath = packageOutputPath.replace(PATH_REGEXP_VERSION, packageVersion);

      const links = packageConfig.links || []; // TODO handle string/object, array of string/object
      links.forEach(link => {
        includeList.push(path.join(packageOutputPath, link));
      });

      const packageAssets = packageConfig.assets || {};
      const packageAssetKeys = Object.keys(packageAssets);
      packageAssetKeys.forEach(packageAssetKey => {
        copyList.push({
          from: path.join(process.cwd(), packagePath, packageName, packageAssetKey),
          to: path.join(packageOutputPath, packageAssets[packageAssetKey])
        });
      });
    }
    // if (packageConfig.cdnAsset && cdnResolver) {
    //   includeList.push(cdnResolver({ name: packageName, version: packageVersion, path: cdnAsset }));
    // } else {
    //   let packageAsset = packageConfig.asset || '';
    //   if (packageAsset) {

    //   }
    // }
  });

  return {
    append,
    publicPath,
    copyList,
    includeList,
    links
  };
}

class HtmlWebpackDeployPlugin {
  constructor (pluginOptions = {}) {
    Object.assign(this, setPluginOptions(pluginOptions));
  }

  apply (compiler) {
    // const externals = compiler.options.externals || {};
    new CopyWebpackPlugin(this.copyList).apply(compiler);
    new HtmlWebpackTagsPlugin({ tags: this.includeList, links: this.links, append: this.append, publicPath: this.publicPath }).apply(compiler);
  }
}
module.exports = HtmlWebpackDeployPlugin;
