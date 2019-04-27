Deploy Assets extension for the HTML Webpack Plugin
========================================

Enhances [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin)
functionality by allowing you to specify local files or node_modules packages that should be injected as html tags
into your html template.


Installation
------------

```shell
$ npm install --save-dev html-webpack-deploy-plugin
```

- You must be running **Node 8.6** or higher for version `2.x` of this plugin.

- This plugin was **renamed** from `html-webpack-deploy-assets-plugin` to `html-webpack-deploy-plugin` in version `2.x`.

- For use with the `Node < 8.6` please use version `1.x` (old README [here](https://github.com/jharris4/html-webpack-deploy-plugin/blob/master/README.V1.md))


Configuration
-------

### Default Options

This plugin will run and do nothing if no options are provided.

The default options for this plugin are shown below:

```js
const path = require('path');

const DEFAULT_OPTIONS = {
  append: false,
  assets: {},
  packages: {},
  addAssetsPath: assetPath => path.join('assets', assetPath),
  addPackagesPath: (packageName, packageVersion, packagePath) => path.join('packages', packageName + '-' + packageVersion, packagePath),
  findNodeModulesPath: (cwd, packageName) => findUp.sync(slash(path.join('node_modules', packageName)), { cwd }),
  useCdn: false,
  getCdnPath: (packageName, packageVersion, packagePath) => `https://unpkg.com/${packageName}@${packageVersion}/${packagePath}`
};
```

---
### Options

All options for this plugin are validated as soon as the plugin is instantiated.

The available options are:

|Name|Type|Default|Description|
|:--:|:--:|:-----:|:----------|
|**`append`**|`{Boolean}`|`false`|Whether to prepend or append the injected tags relative to any existing tags (should be set to **false** when using any `script` tag asset **`external`**) |
|**`assets`**|`{Object}`|`undefined`|The local assets to copy into the webpack output directory and inject into the template html file|
|**`packages`**|`{Object}`|`undefined`|The `node_modules` packages to copy into the webpack output directory and inject into the template html file|
|**`addAssetsPath`**|`{Function}`|`see above`|The function to call to get the output path for `assets` when copying and injecting them|
|**`addPackagesPath`**|`{Function}`|`see above`|The function to call to get the output path for `packages` when copying and injecting them|
|**`useCdn`**|`{Boolean}`|`false`|Whether or not to use the **`getCdnPath`** to replace the asset paths with their `cdn urls`|
|**`getCdnPath`**|`{Function}`|`see above`|The function to use when replacing asset paths with `cdn urls`|

---

The **`assets`** option can be used to specify local assets that should be copied to the webpack output directory and injected into the `index.html` as tags.

This option requires an object with any of the `copy`, `links`, or `scripts` properties.

The settings for these are based on the [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin) and the [html-webpack-tags-plugin](https://github.com/jharris4/html-webpack-tags-plugin)

For example, to copy some assets to webpack, and insert a `\<link\>` and `\<script\>` tag:

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

For example, to copy some assets from `bootstrap` to webpack, and insert a `\<link\>` and `\<script\>` tag for bootstrap:

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

The **`variableName`** can be used to tell `webpack` to stop bundling a package, and instead load it from the injected `\<script\>`.

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
Deploying bootstrap css and fonts and an assets directory from local files:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackDeployAssetsPlugin({
    packages: {
      "bootstrap": {
        copy: [
          { from: "dist/css", to: "css/" },
          { from: "dist/fonts", to: "fonts/" }
        ],
        links: [
          "css/bootstrap.min.css",
          "css/bootstrap-theme.min.css"
        ]
      }
    },
    assets: {
      copy: [
        { from: "src/assets", to: "assets/" }
      ],
      links: {
        "href": "/assets/icon.png",
        "rel": "icon"
      }
    }
  })
]
```

This will generate a `dist/index.html` with your webpack bundled output **and** the following:

```html
<!DOCTYPE html>
<html>
 <head>
   <meta charset="UTF-8">
   <title>Webpack App</title>
   <link href="bootstrap-3.3.7/css/bootstrap.min.css" rel="stylesheet">
   <link href="bootstrap-3.3.7/css/bootstrap-theme.min.css" rel="stylesheet">
   <link href="bootstrap-3.3.7/css/bootstrap-theme.min.css" rel="stylesheet">
   <link href="/assets/icon.png" rel="icon">
 </head>
 <body>
   <script src="index_bundle.js"></script>
 </body>
</html>
```

Note that additionally, the contents of the following directories will be copied:

`node_modules/bootstrap/dist/css` -> `dist/bootstrap-3.3.7/css`
`node_modules/bootstrap/dist/fonts` -> `dist/bootstrap-3.3.7/fonts`
`src/assets` -> `dist/assets`