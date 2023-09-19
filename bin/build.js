const path = require('path');

process.argv.push('--cwd', '.', '-f', path.resolve(__dirname, '../dist/gulpfile.js'), 'build');
require('gulp-cli')();
