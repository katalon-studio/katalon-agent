#!/bin/bash

set -xe

npm ci
npm run buildLinux2 --if-present
chmod +x bin/cli-linux *.sh

ls -al ./bin