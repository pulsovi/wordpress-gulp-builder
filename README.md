# WordPress Gulp Builder

## Installation

for contributors

```shell
project_name="wp_<mon-projet>" # Modifier cette ligne
cd "C:\dev\_WP_Plugins"
mkdir "$project_name"
cd "$project_name"
git init
git submodule add git@github.com:pulsovi/wordpress-gulp-builder.git builder
ln builder/gulpfile.ts .
ln builder/tsconfig.json .
cp builder/.gulpconfig.json.dist .gulpconfig.json
yarn add -D gulp wp-gulp-builder@https://github.com/pulsovi/wordpress-gulp-builder.git
```

### After git update

`yarn up wp-gulp-builder@https://github.com/pulsovi/wordpress-gulp-builder.git`

## Usage

### build

`yarn gulp build` will build all plugins and snippets to the `build/` folder

#### plugins

Each plugin need to have a `.php` file with the same name of its directory name.
All files in the plugin directory is copied as is to the `.zip` archive, except of thoses files which are compiled :

- `*.md`: markdown files are compiled in-place to HTML format. Two `.html` files are generated :
    + `<original name>.html` contains the same contents of the origina markdown file compiled to HTML.
    + `<original name>-full.html` wrapes the contents of `<original name>.html` with HTML document, head and body. Adding to it GitHub styles and a title : the stem of the markdown file.

#### snippets

Each snippet is compiled to a `*.code-snippets.json` file which can be imported by the [Code Snippet](https://wordpress.org/plugins/code-snippets/) plugin.

Two files are compiled for each snippet :

- code file : the `.php` file which have the same name of the snippet directory. This file is compiled following the [API > Snippets](#preprocessor) instructions.
- documentation file : the `README.md` file. This file is compiled as HTML code, wrapped by a `<details>` HTML bloc and used for documentation field of the snippet.

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
 * Snippet Name: <Titre du snippet>
 * Description: <Description du snippet>
 * Version: 1.0.0
 * Scope: front-end
 * Author: David GABISON <david.gabison@outlook.com>
 */
```

```html
<!--
/**
 * Snippet Name: <Titre du snippet>
 * Description: <Description du snippet>
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
- `<<<command arg1 arg2 ...>>>`

Available commands are 

|Command|Args|Description|
|-------|----|-----------|
|`include_raw`|**`filename`** string|Add the raw content of the filename in place of the preprocessor command|
|`php_string`|**`filename`** string|Convert the content of the file to a PHP string, escaping the specials chars and add it (wrapped by `'`) in place of the preprocessor command|
