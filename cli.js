// add an empty argument to the front in case the package is compiled to native code
if (process.isPackaged) {
  process.argv.unshift('');
}

const program = require('commander');
const path = require('path');
const readline = require('readline');

if (process.argv.includes('--service')) {
  global.appRoot = path.resolve(path.dirname(process.execPath));
  process.argv = process.argv.filter((arg) => arg !== '--service');
} else {
  global.appRoot = path.resolve('.');
}

const { Agent, updateConfigs } = require('./src/service/agent');
const config = require('./src/core/config');
const packageJson = require('./package.json');

const version = `Version: ${packageJson.version}`;
config.version = packageJson.version;

program
  .command('config')
  .option('-s, --server-url <value>', 'Katalon Analytics URL')
  .option('-u, --username <value>', 'Email')
  .option('-p, --apikey <value>', 'API key')
  .option('-t, --organizationid <value>', 'Organization ID')
  .option('-a, --agent-name <value>', 'Agent name')
  .option('-c, --config <value>', 'Configuration file path')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .option('--log-level <value>', 'Log level (ALL < TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK < OFF)')
  .option('--xvfb-run <value>', 'xvfb-run options')
  .option('--x11-display <value>', 'x11 DISPLAY environment variable')
  .option('--keep-files', 'Keep test project temporary files')
  .option('--no-keep-files', 'Remove test project temporary files (default behavior)')
  .action((command) => {
    const options = {
      serverUrl: command.serverUrl,
      email: command.username,
      apikey: command.apikey,
      organizationId: command.organizationid,
      agentName: command.agentName,
      configPath: command.config,
      proxy: command.proxy,
      logLevel: command.logLevel,
      xvfbRun: command.xvfbRun,
      x11Display: command.x11Display,
      keepFiles: command.keepFiles,
    };
    updateConfigs(options);
  });

program
  .command('start-agent')
  .version(version)
  .option('-s, --server-url <value>', 'Katalon Analytics URL')
  .option('-u, --username <value>', 'Email')
  .option('-p, --apikey <value>', 'API key')
  .option('-t, --organizationid <value>', 'Organization ID')
  .option('-a, --agent-name <value>', 'Agent name')
  .option('-c, --config <value>', 'Configuration file path')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .option('--ci', 'CI mode')
  .action((command) => {
    const options = {
      serverUrl: command.serverUrl,
      email: command.username,
      apikey: command.apikey,
      teamId: command.organizationid,
      agentName: command.agentName,
      configPath: command.config,
      proxy: command.proxy,
    };
    if (process.platform === 'win32') {
      readline
        .createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        .on('SIGINT', () => {
          process.emit('SIGINT');
        });
    }

    const agent = new Agent(options);

    process.on('SIGINT', () => {
      agent.stop();
      // graceful shutdown
      process.exit();
    });

    if (command.ci) {
      agent.startCI().then(() => process.emit('SIGINT'));
    } else {
      agent.start();
    }
  });

program.version(version);

program.parse(process.argv);
