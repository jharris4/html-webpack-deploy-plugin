Deploy Assets extension for the HTML Webpack Plugin
========================================

Enhances [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin)
functionality by allowing you to specify js or css assets from node_modules to be copied and included.

Installation
------------
You must be running webpack on node 0.12.x or higher

Install the plugin with npm:
```shell
$ npm install --save-dev html-webpack-deploy-assets-plugin
```

Example
-------
Deploying bootstrap css and fonts:

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
 </head>
 <body>
   <script src="index_bundle.js"></script>
 </body>
</html>
```

Note that additionally, the contents of the following directories will be copied:

`node_modules/bootstrap/dist/css` -> `dist/bootstrap-3.3.7/css`
`node_modules/bootstrap/dist/fonts` -> `dist/bootstrap-3.3.7/fonts`