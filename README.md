# KATALON AGENT

## How to start Katalon Agent from CLI, for devs

- Create `agentconfig` file and save it into Katalon Agent's root folder.
```$xslt
agentName=New Agent
email=<your email>
apikey=<your apikey>
serverUrl=https://analytics.katalon.com/
teamId=<your team you want to intergate with agent>
keepFiles=true
logLevel=info
```

You can get an API key from [here](https://analytics.katalon.com/user/apikey).

- Start the Command Prompt and cd to Katalon Agent's folder. 

Note: On first start, you should run `npm install` to download all library in `package.json`.

- To start Katalon Agent: run `npm start` in command-line.

If you want start Katalon Agent in debug mode, you have to set `NODE_ENV = debug` in system variables.

### Tips for IntelliJ
- To create debug mode in IntelliJ
```$xslt
Run --> Edit Configurations... -> + --> 'Node.js'
```
In Configuration tab, setup values below:
```
Node interpreter: <Select your node location>
Node parameters: cli.js start-agent
Working directory: <Katalon Agent's folder>
```

## How to package Katalon Agent
- From command line, run: `npm build`

#### To explorer Katalon Agent, you should start from `cli.js` and `agent.js`
