# WordPress Gulp Builder

## API

### Snippets

#### Preprocessor

Preprocessor commands have to be inserted as this syntax : 
`/*<<<command arg1 arg2 ...>>>*/` or this `<!--<<<command arg1 arg2 ...>>>-->`

Available commands are 

|Command|Args|Description|
|-------|----|-----------|
|`include_raw`|**`filename`** string|Add the raw content of the filename in place of the preprocessor command|
