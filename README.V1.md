Deploy Assets extension for the HTML Webpack Plugin
========================================

Enhances [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin)
functionality by allowing you to specify js or css assets from node_modules to be copied and included.

-----

This is the **old version** of this plugin. Please update to the `2.x` [version](https://github.com/jharris4/html-webpack-deploy-plugin/blob/master/README.md) if possible.

-----

Installation
------------
You must be running webpack on node 0.12.x or higher

Install the plugin with npm:
```shell
$ npm install --save-dev html-webpack-deploy-assets-plugin
```

(Note that this plugin was **renamed** in version `2.x`)

Options
-------
The available options are:

- `packagePath`: `string`

  The path to installed packages, relative to the current directory. Default is `node_modules`.

- `append`: `boolean`

  Specifies whether the assets will be appended (`true`) or prepended (`false`) to the list of assets in the html file. Default is `false`.

- `publicPath`: `boolean` or `string`

  Specifying whether the assets should be prepended with webpack's public path or a custom publicPath (`string`).

  A value of `false` may be used to disable prefixing with webpack's publicPath, or a value like `myPublicPath/` may be used to prefix all assets with the given string. Default is `true`.

- `outputPath`: `string`

  A directory name that will be created for each of the deployed assets.

    Instances of `[name]` will be replaced with the package name.
    Instances of `[version]` will be replaced with the package version.

  Default is `[name]-[version]`.

- `packages`: `object`

  Specifies the definition of the assets from installed packages to be deployed. Defaults is `{}`.

  The keys/properties of the packages option must be the name of an installed package, and the definition must be
  an object with the following properties:

    - 'outputPath': `string`

    Allows the global `outputPath` to be overriden on a per-package basis. Default is the global value.

    - `assets`: `object`

    Specifies files or directories to be copied from the package's directory.

    The keys/properies are the asset to be copied, and the values are the target asset location within webpack's output directory.

    These are used as the from & to properties for the internal usage of the [copy-webpack-plugin](https://github.com/kevlened/copy-webpack-plugin)

    - `entries`: `array`

    Specifies files to be included in the html file.

    The file paths should be relative to webpack's output directory.

- `assets`: `object`

  Specifies the definition of the local assets to be deployed. Defaults is `{}`.

  The keys/properies are the asset to be copied, and the values are the target asset location within webpack's output directory.

- `links`: `array`

  Specifies the definition of the links to be deployed. Defaults is `[]`.

  The objects in the links are of the shape:

  ```javascript
  {
    href: "path/to/asset", // required - must be a string
    rel: "icon",           // required - must be a string
    sizes: '16x16',            // example of optional extra attribute
    anyOtherAttribute: 'value'
  }
  ```

  For which the following would be injected into the html header:

  ```html
  <head>
    <link href="${webpack.publicPath}/path/to/asset" rel="icon" sizes="16x16" anyOtherAttribute="value"/>
  </head>
  ```


Example
-------
Deploying bootstrap css and fonts and an assets directory from local files:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackDeployAssetsPlugin({
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
    },
    "assets": {
      "src/assets": "assets/"
    }
    "link": [
      {
        "href": "/assets/icon.png",
        "rel": "icon"
      }
    ]
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
