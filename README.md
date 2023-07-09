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

## API

### Snippets

#### Preprocessor

Preprocessor commands have to be inserted as this syntax : 
`/*<<<command arg1 arg2 ...>>>*/` or this `<!--<<<command arg1 arg2 ...>>>-->`

Available commands are 

|Command|Args|Description|
|-------|----|-----------|
|`include_raw`|**`filename`** string|Add the raw content of the filename in place of the preprocessor command|
