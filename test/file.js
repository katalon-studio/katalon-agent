const file = require('../src/file');
const tmp = require('tmp');

const url = 'https://github.com/katalon-studio/katalon-recorder/archive/v3.6.14.zip';
const dir = tmp.dirSync({
  keep: true
});
const dirPath = dir.name;
file.downloadAndExtract(url, dirPath);