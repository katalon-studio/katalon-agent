#!/bin/bash

set -xe

npm ci
npm run buildLinux --if-present
npm run buildLinuxArm --if-present
chmod +x bin/cli-linux-x64 bin/cli-linux-arm64 *.sh

ls -al ./bin