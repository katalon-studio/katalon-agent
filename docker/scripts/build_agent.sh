#!/bin/bash

set -xe

npm ci
npm run build
node --experimental-sea-config sea-config.json 
cp $(command -v node) agent 
npx postject agent NODE_SEA_BLOB agent.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

chmod +x agent
mkdir bin
cp agent bin/cli-linux-x64  
npm run afterbuild
ls -al bin