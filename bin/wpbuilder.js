import path from 'path';

process.argv.splice(2, 0, '--cwd', '.', '-f', path.resolve(__dirname, '../dist/gulpfile.js'));
require('gulp-cli')();
