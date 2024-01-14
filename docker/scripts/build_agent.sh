#!/bin/bash

set -xe

npm ci
npm run buildLinux --if-present
chmod +x bin/cli-linux-x64 *.sh

ls -al ./bin