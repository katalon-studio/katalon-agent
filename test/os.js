const os = require('../src/os');

console.log(os.getVersion());

os.runCommand('dir', null, null)
  .then((code) => {
    console.log(`runCommand ended with exit code ${code}`);
  });