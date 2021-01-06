#!/bin/bash

set -xe

echo "Install Katalon Agent"
chmod u+x $KATALON_AGENT_DIR
echo "Katalon Agent $AGENT_VERSION" >> $KATALON_VERSION_FILE

chmod -R 777 $KATALON_ROOT_DIR
chmod -R 777 $KATALON_SOFTWARE_DIR

cat $KATALON_VERSION_FILE
