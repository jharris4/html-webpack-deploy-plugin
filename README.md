Deployment  extension for the HTML Webpack Plugin
========================================

Enhances [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) allowing you to **copy** `assets` or `node_modules package assets` into your webpack build and **inject** them as tags into your `html`.

Built on top of the [html-webpack-tags](https://github.com/jharris4/html-webpack-tags-plugin) and [copy-webpack](https://github.com/webpack-contrib/copy-webpack-plugin) plugins.

Installation
------------

```shell
$ npm install --save-dev html-webpack-deploy-plugin
```

- You must be running **Node 8.6** or higher for version `2.x` of this plugin.

- This plugin was **renamed** from `html-webpack-deploy-assets-plugin` to `html-webpack-deploy-plugin` in version `2.x`.

- For use with the `Node < 8.6` please use version `1.x` (old README [here](https://github.com/jharris4/html-webpack-deploy-plugin/blob/master/README.V1.md))

---

Integration
-----------

The **`chunksSortMode`** option of [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) `3.x` has a **default** value of `auto`.

This option is known to cause issues with `code splitting` or `lazy loaded bundles` ([#981](https://github.com/jantimon/html-webpack-plugin/issues/981)).

When using this plugin with version `3.x` you should set this **`chunksSortMode`** to **'none'**, like this:

```js
new HtmlWebpackPlugin({ chunksSortMode: 'none' })
```

Configuration
-------------

The plugin configuration is specified by an options **object** passed to its constructor.

This object has an **`assets`** option for copying & injecting local files, and a **`packages`** option for copying & injecting packages from your local `node_modules` directory.

```js
new HtmlWebpackDeployPlugin({
  assets: {
    copy: [{ from: 'a', to: 'b' }],
    links: [
      'b/my.css',
      {
        hash: false,
        publicPath: false,
        path: 'b/my.png',
        attributes: {
          rel: 'icon'
        }
      }
    ],
    scripts: 'b/my.js'
  },
  packages: {
    'bootstrap': {
      copy: [{ from 'dist/bootstrap.min.css', to: 'bootstrap.min.css'}],
      links: {
        useCdn: true,
        path: 'bootstrap.min.css',
        cdnPath: 'dist/bootstrap.min.css'
      },
    },
    'react': {
      copy: [{ from: 'umd', to: '' }],
      scripts: {
        variableName: 'React'
        path: 'react.production.min.js',
        cdnPath: 'umd/react.production.min.js',
      }
    },
    'react-dom': {
      copy: [{ from: 'umd', to: '' }],
      scripts: {
        variableName: 'ReactDOM'
        path: 'react-dom.production.min.js',
        cdnPath: 'umd/react-dom.production.min.js',
      },
      useCdn: false
    }
  },
  useCdn: true,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
});
```

All options for this plugin are **validated** as soon as the plugin is instantiated.

Options are **inherited** by inner levels of the config and will be overridden if specified in a level.

The available options are described below, grouped by at what <i>level</i> in the plugin config they may be used.

#### Root Options

These options are only available at the root level of the plugin config.

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`assets`**|`{Object}`|`undefined`|The local assets to copy into the webpack output directory and inject into the template html file|
|**`packages`**|`{Object}`|`undefined`|The `node_modules` packages to copy into the webpack output directory and inject into the template html file|
|**`useAssetsPath`**|`{Boolean}`|`true`|Whether or not to prefix all assets with the `assetsPath`|
|**`addAssetsPath`**|`{Function}`|`see below`|The function to call to get the output path for assets when copying and injecting them|
|**`assetsPath`**|`{Boolean\|String\|Function}`|`undefined`|Shortcut for specifying both **`useAssetsPath`** and **`addAssetsPath`** at the same time|
|**`usePackagesPath`**|`{Boolean}`|`true`|Whether or not to prefix all packages with the `packagesPath`|
|**`addPackagesPath`**|`{Function}`|`see below`|The function to call to get the output path for `packages` when copying and injecting them|
|**`packagesPath`**|`{Boolean\|String\|Function}`|`undefined`|Shortcut for specifying both **`usePackagesPath`** and **`addPackagesPath`** at the same time|
|**`getPackagePath`**|`{Function}`|`see below`|The function to call to get the output path for a `package` & `version` when copying and injecting it|
|**`findNodeModulesPath`**|`{Function}`|`see below`|The function to call to find the `node_modules` directory where packages to be deployed are installed so their `version` can be read from their `package.json` file. The default is to search upwards in the current working directory|
|**`files`**|`{Array<String>}`|`[]`|If specified this plugin will only inject tags into the html-webpack-plugin instances that are injecting into these files  (uses [minimatch](https://github.com/isaacs/minimatch))|
|**`prependExternals`**|`{Boolean}`|`true`|Whether to default **`append`** to **false** for any `<script>` `tag` that has an **`external`** or **`variableName`** option specified|


### All Level Options

Several options from the [html-webpack-tags-plugin](https://github.com/jharris4/html-webpack-tags-plugin) are available at all levels.

Options are passed down the levels, and overriden if specified at a lower level.

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`append`**|`{Boolean}`|`true`|Whether to prepend or append the injected tags relative to any existing or webpack bundle tags (should be set to **false** when using any `script` tag **`external`**) |
|**`useHash`**|`{Boolean}`|`false`|Whether to inject the webpack `compilation.hash` into the tag paths|
|**`addHash`**|`{Function(assetPath:String, hash:String):String}`|`see below`|The function to call when injecting the `hash` into the tag paths|
|**`hash`**|`{Boolean\|Function}`|`undefined`|Shortcut to specifying `useHash` and `addHash`|
|**`usePublicPath`**|`{Boolean}`|`true`|Whether to inject the (webpack) `publicPath` into the tag paths|
|**`addPublicPath`**|`{Function(assetPath:String, publicPath:String):String}`|`see below`|Whether to inject the `publicPath` into the tag paths|
|**`publicPath`**|`{Boolean\|String\|Function}`|`undefined`|Shortcut to specifying `usePublicPath` and `addPublicPath`|

### Assets and Packages Options

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`links`**|`{String\|Object\|Array<String\|Object>}`|`[]`|The tags to inject as `<link>` html tags|
|**`scripts`**|`{String\|Object\|Array<String\|Object>}`|`[]`|The tags to inject as `<script>` html tags|
|**`copy`**|`{Array<Object>|Object}`|`[]`|The file assets to copy (uses [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin) config format)|

### Packages Options

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`copy.fromAbsolute`**|`{Boolean}`|`false`|When set to true, the `copy.from` will **not** be prefixed with the package's `node_modules` relative path|


### Root and Packages and Tag-inside-Packages Options

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`useCdn`**|`{Boolean}`|`false`|Whether or not to use the **`getCdnPath`** to replace the tag paths with their `cdn urls`|
|**`getCdnPath`**|`{Function}`|`see below`|The function to use when replacing tag paths with `cdn urls`|

### Tag Options

The available `tag options` for **`links`** or **`scripts`** are defined by the [html-webpack-tags-plugin](https://github.com/jharris4/html-webpack-tags-plugin/).

Additional `tag options` are defined by this plugin:

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`devPath`**|`{String}`|`optional`|Alternative path to use for the tag when `webpack.mode === "development"`. Only used when the **`useCdn`** option inherited by the tag is false|
|**`cdnPath`**|`{String}`|`optional`|Alternative path to use for the tag when the **`useCdn`** option inherited by the tag is true|

---

### Default Options

This plugin will run and do nothing if no options (`{}`) are provided.

The default options for this plugin are shown below:

```js
const path = require('path');
const findUp = require('find-up');
const slash = require('slash'); // fixes slashes in file paths for windows

const DEFAULT_OPTIONS = {
  assets: {},
  packages: {},
  useAssetsPath: true,
  addAssetsPath: assetPath => path.join('assets', assetPath),
  usePackagesPath: true,
  addPackagesPath: packagePath => path.join('packages', packagePath),
  getPackagePath: (packageName, packageVersion, packagePath) => path.join(packageName + '-' + packageVersion, packagePath),
  findNodeModulesPath: (cwd, packageName) => findUp.sync(slash(path.join('node_modules', packageName)), { cwd }),
  useCdn: false,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
};
```

---

### Option Details

The **`assets`** option can be used to specify local assets that should be copied to the webpack output directory and injected into the `index.html` as tags.

This option requires an object with any of the `copy`, `links`, or `scripts` properties.

The settings for these are based on the [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin) and the [html-webpack-tags-plugin](https://github.com/jharris4/html-webpack-tags-plugin)

For example, to copy some assets to webpack, and insert a `<link>` and `<script>` tag:

```js
const pluginOptions = {
  assets: {
    copy: [
      { from: 'src-path/assets', to: 'dst-path/assets' },
      { from: 'src-path/js', to: 'dst-path/js' }
      { from: 'src-path/css/src-file.png', to: 'dst-path/dst-file.png' }
    ],
    links: [
      { path: 'dst-path/dst-file.png', attributes: { rel: 'icon' }
    ],
    scripts: [
      { path: 'dst-path/js/script.js', }
    ]
  }
};
```

The above example will generate something like the following html:

```html
<head>
  <link href="${webpack.publicPath}dst-path/dst-file.png" rel="icon">
</head>
<body>
  <script src="${webpack.publicPath}dst-path/js/script.js"></script>
</body>
```

---

The **`packages`** option can be used to specify package assets that should be copied to the webpack output directory and injected into the `index.html` as tags.

This option requires an object with any of the `copy`, `links`, or `scripts` properties.

The settings for these are based on the [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin) and the [html-webpack-tags-plugin](https://github.com/jharris4/html-webpack-tags-plugin)

For example, to copy some assets from `bootstrap` to webpack, and insert a `<link>` and `<script>` tag for bootstrap:

```js
const pluginOptions = {
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
};
```

---

The **`variableName`** can be used to tell `webpack` to stop bundling a package, and instead load it from the injected `<script>`.

The above example will generate something like the following html:

```html
<head>
  <link href="${webpack.publicPath}css/bootstrap.min.css">
</head>
<body>
  <script src="${webpack.publicPath}js/bootstrap.bundle.min.js"></script>
</body>
```


---

Examples
-------
Deploying `Bootstrap` css and fonts and an assets directory from local files:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackDeployAssetsPlugin({
    packages: {
      'bootstrap': {
        copy: [
          { from: 'dist/css', to: 'css/' },
          { from: 'dist/fonts', to: 'fonts/' }
        ],
        links: [
          'css/bootstrap.min.css',
          'css/bootstrap-theme.min.css'
        ]
      }
    },
    assets: {
      copy: [{ from: 'src/assets', to: 'assets/' }],
      links: {
        path: '/assets/icon.png',
        attributes: {
          rel:'icon'
        }
      }
    }
  })
]
```

This will generate a `index.html` something like:

```html
<!DOCTYPE html>
<html>
 <head>
   <meta charset="UTF-8">
   <title>Webpack App</title>
   <link href="any-webpack-generated-styles.css" rel="stylesheet">
   <link href="bootstrap-3.3.7/css/bootstrap.min.css" rel="stylesheet">
   <link href="bootstrap-3.3.7/css/bootstrap-theme.min.css" rel="stylesheet">
   <link href="/assets/icon.png" rel="icon">
 </head>
 <body>
  <script src="any-webpack-generated-bundles.js"></script>
 </body>
</html>
```

Note that additionally, the contents of the following directories will be copied:

`node_modules/bootstrap/dist/css` -> `dist/bootstrap-3.3.7/css`
`node_modules/bootstrap/dist/fonts` -> `dist/bootstrap-3.3.7/fonts`
`src/assets` -> `dist/assets`

---

Deploying `React` from a `CDN`:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackDeployAssetsPlugin({
    packages: {
      'react': {
        copy: [{ from: 'umd', to: '' }],
        scripts: {
          variableName: 'React'
          path: 'react.production.min.js',
          cdnPath: 'umd/react.production.min.js',
        }
      },
      'react-dom': {
        copy: [{ from: 'umd', to: '' }],
        scripts: {
          variableName: 'ReactDOM'
          path: 'react-dom.production.min.js',
          cdnPath: 'umd/react-dom.production.min.js',
        }
      }
    }
    useCdn: true,
    getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
  })
]
```

This will generate a `index.html` with your webpack bundled output **and** the following:

```html
<!DOCTYPE html>
<html>
 <head>
   <meta charset="UTF-8">
   <title>Webpack App</title>
   <link href="any-webpack-generated-styles.css" rel="stylesheet">
 </head>
 <body>
  <script src="https://unpkg.com/react@16.8.6/umd/react.production.js"></script>
  <script src="https://unpkg.com/react-dom@16.8.6/umd/react-dom.production.js"></script>
  <script src="any-webpack-generated-bundles.js"></script>
  <!-- react & react-dom were removed from webpack bundles automatically -->
 </body>
</html>
```

---

Deploying `React` from `Local UMD Bundles`:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackDeployAssetsPlugin({
    packages: {
      'react': {
        copy: [{ from: 'umd', to: '' }],
        scripts: {
          variableName: 'React'
          path: 'react.production.min.js',
          devPath: 'react.development.js'
        }
      },
      'react-dom': {
        copy: [{ from: 'umd', to: '' }],
        scripts: {
          variableName: 'ReactDOM'
          path: 'react-dom.production.min.js',
          devPath: 'react-dom.development.js'
        }
      }
    }
  })
]
```

This copies `react` and `react-dom` into webpack's output directory, versioning the directory automatically based on their installed version. They can now be referenced from the tag paths in the html.

Webpack is instructed that `react` and `react-dom` are **external** so they are **no longer bundled** by webpack.

The generated `index.html` looks like:

```html
<!DOCTYPE html>
<html>
 <head>
   <meta charset="UTF-8">
   <title>Webpack App</title>
   <link href="any-webpack-generated-styles.css" rel="stylesheet">
 </head>
 <body>
  <script src="my-public-path/packages/react-16.8.6/react.production.min.js"></script>
  <script src="my-public-path/packages/react-dom-16.8.6/react-dom.production.min.js"></script>
  <script src="any-webpack-generated-bundles.js"></script>
  <!-- react & react-dom were removed from webpack bundles automatically -->
 </body>
</html>
```

Or in **development** mode because the **`devPath`** option was specified, the generated `index.html` looks like:

```html
<!DOCTYPE html>
<html>
 <head>
   <meta charset="UTF-8">
   <title>Webpack App</title>
   <link href="any-webpack-generated-styles.css" rel="stylesheet">
 </head>
 <body>
  <script src="my-public-path/packages/react-16.8.6/react.development.js"></script>
  <script src="my-public-path/packages/react-dom-16.8.6/react-dom.development.js"></script>
  <script src="any-webpack-generated-bundles.js"></script>
  <!-- react & react-dom were removed from webpack bundles automatically -->
 </body>
</html>
```

---

### Non CDN Options

When doing custom deployment without a CDN it can be useful to configure the directories that all assets and packages are copied to and served from.

The following examples show some useful settings for such situations.

---

Disabling the grouping of assets into the `assets` directory:

```js
new HtmlWebpackDeployAssetsPlugin({ useAssetsPath: false });
```

```html
<link href="my-public-path/assets/file.css">
<script src="my-public-path/assets/file.js"></script>
```

becomes:

```html
<link href="my-public-path/file.css">
<script src="my-public-path/file.js"></script>
```

---

Custom grouping of assets into a `configurable` directory:

```js
new HtmlWebpackDeployAssetsPlugin({ assetsPath: 'my-assets-path' });
```

```html
<link href="my-public-path/assets/file.css">
<script src="my-public-path/assets/file.js"></script>
```

becomes:

```html
<link href="my-public-path/my-assets-path/file.css">
<script src="my-public-path/my-assets-path/file.js"></script>
```

---

Disabling the grouping of packages into the `packages` directory:

```js
new HtmlWebpackDeployAssetsPlugin({ usePackagesPath: false });
```

```html
<link href="my-public-path/packages/bootstrap-4.3.1/bootstrap.min.css">
<script src="my-public-path/packages/react-16.8.6/react.production.min.js"></script>
```

becomes:

```html
<link href="my-public-path/bootstrap-4.3.1/bootstrap.min.css">
<script src="my-public-path/react-16.8.6/react.production.min.js"></script>
```

---

Custom grouping of packages into a `configurable` directory:

```js
new HtmlWebpackDeployAssetsPlugin({ packagesPath: 'my-packages-path' });
```

```html
<link href="my-public-path/packages/bootstrap-4.3.1/bootstrap.min.css">
<script src="my-public-path/packages/react-16.8.6/react.production.min.js"></script>
```

becomes:

```html
<link href="my-public-path/my-packages-path/bootstrap-4.3.1/bootstrap.min.css">
<script src="my-public-path/my-packages-path/react-16.8.6/react.production.min.js"></script>
```