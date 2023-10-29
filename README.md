# WordPress Gulp Builder

## Installation

```
yarn set version stable
# [Gulp does not work with PnP · Issue #6516 · yarnpkg/yarn](https://github.com/yarnpkg/yarn/issues/6516)
yarn config set nodeLinker node-modules
yarn add -D wp-gulp-builder@https://github.com/pulsovi/wordpress-gulp-builder.git
yarn wpbuilder init
```

## Usage

### build

`yarn wpbuilder build` will build all plugins and snippets to the `build/` folder

### dev

`yarn wpbuilder dev` will compile all files which need compilation and follow (watch and copy) them to the target local server configured in `.wpbuilderrc.json`.

#### plugins

Each plugin need to have a `.php` file with the same name of its directory name.

`yarn wpbuilder addPlugin` will add these files

All files in the plugin directory is copied as is to the `.zip` archive, except of thoses files which are compiled :

- `*.md`: markdown files are compiled in-place to HTML format. Two `.html` files are generated :
    + `<original name>.html` :  
        contains the same contents of the origina markdown file compiled to HTML.
    + `<original name>-full.html` :  
        - Wrape the contents of `<original name>.html` with HTML5 document structure, head and body.
        - Add GitHub styles and a title : the stem of the markdown file.
        - Add `<base target="_blank" />` balise.
        - Add a script which put the value of the GET query parameter `base` as the `<base>` `href` value.

#### snippets

`yarn wpbuilder addSnippet`

Each snippet is compiled to a `*.code-snippets.json` file which can be imported by the [Code Snippet](https://wordpress.org/plugins/code-snippets/) plugin.

Two files are compiled for each snippet :

- **code file :** the `.php` file which have the same name as the snippet directory. This file is compiled following the [API > Snippets](#preprocessor) instructions.
- **documentation file :** the `README.md` file. This file is compiled as HTML code, wrapped by a `<details>` HTML bloc and used as `documentation` field of the snippet.

## API

### Snippets

Each snippet must have a "main file". 
The main file is the `.php` or `.html` file which have the same name as the snippet directory.
This file should have a header similarly to the plugin header.

### Header

Header Examples :

```php
<?php
/**
 * Snippet Name: <Title of the snippet>
 * Description: <Description of the snippet>
 * Version: 1.0.0
 * Scope: front-end
 * Author: David GABISON <david.gabison@outlook.com>
 */
```

```html
<!--
/**
 * Snippet Name: <Title of the snippet>
 * Description: <Description of the snippet>
 * Version: 1.0.0
 * Scope: content
 * Author: David GABISON <david.gabison@outlook.com>
 */
-->
```

|Section name|Description|
|`Snippet Name`|The title of the snippet|
|`Version`|The semver number of the snippet code|
|`Scope`|Optional, this field provide possibility to manage the snippet behavior. Possible values are<dl><dt>`global`</dt><dd>The default value. The snippet is added as is in the functions.php file</dd><dt>`content`</dt><dd>The snippet code is HTML code and it will be added to a page through a shortcode.</dd><dt>`front-end`</dt><dd>Same of `global`, but it's disabled in back-office pages</dd><dt>`single-use`</dt><dd>The snippet is disabled by default and can be launched once by clicking on the "play" button in the Code Snippet admin page</dd></dl>|

#### Preprocessor

The main file of the snippet will be preprocessed. Each preprocessor command will be parsed and replaced by its meaning content.

Allowed preprocessor commands syntaxes : 

- `/*<<<command arg1 arg2 ...>>>*/` 
- `<!--<<<command arg1 arg2 ...>>>-->`
- `'<<<command arg1 arg2 ...>>>'`
- `"<<<command arg1 arg2 ...>>>"`
- `# command arg1 arg2 ...` must be alone on his line.
- `<<<command arg1 arg2 ...>>>`

Available commands are 

|Command|Args|Description|
|-------|----|-----------|
|`include_raw`|**`filename`** string|Include the raw content of the filename.|
|`php_string`|**`filename`** string|Include the content of the file as a single-quote PHP string, escaping the specials chars.|
|`include_once`|**`filename`** string|Include php file content if it's not already included|

## Contribution

### Installation for contributors

```shell
project_name="wp_<mon-projet>" # Modifier cette ligne
cd "C:\dev\_WP_Plugins"
mkdir "$project_name"
cd "$project_name"
git init
git submodule add git@github.com:pulsovi/wordpress-gulp-builder.git builder
ln builder/gulpfile.ts .
ln builder/tsconfig.json .
cp builder/.wpbuilderrc.json.dist .wpbuilderrc.json
yarn add -D gulp wp-gulp-builder@https://github.com/pulsovi/wordpress-gulp-builder.git
```

### After git update

`yarn up wp-gulp-builder@https://github.com/pulsovi/wordpress-gulp-builder.git`
