#!/bin/bash

set -xe

echo "Upgrade Google Chrome"
chrome_package='google-chrome-stable_current_amd64.deb'
wget -O $chrome_package  https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i $chrome_package || apt -y -f install
rm $chrome_package
./wrap_chrome_binary.sh
echo "$(google-chrome --version)" >> $KATALON_VERSION_FILE || true
