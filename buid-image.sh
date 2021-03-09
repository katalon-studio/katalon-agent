#!/bin/bash

set -xe

agent_version=$1

docker build -t katalon-agent --build-arg AGENT_VERSION=$agent_version .