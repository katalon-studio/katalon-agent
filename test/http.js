const http = require('../src/http');
const tmp = require('tmp');
const fs = require('fs');

const file = tmp.fileSync();
const filePath = file.name;
console.log(filePath);
const url = 'https://github.com/katalon-studio/katalon-recorder/archive/v3.6.14.zip';
http.stream(url, filePath)
  .then(function() {
    const stats = fs.statSync(filePath);
    console.log(stats['size']);
  });