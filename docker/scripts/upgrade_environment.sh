#!/bin/bash

set -xe

echo "Upgrade Mozilla Firefox"
install -d -m 0755 /etc/apt/keyrings
wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O- | tee /etc/apt/keyrings/packages.mozilla.org.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" | tee -a /etc/apt/sources.list.d/mozilla.list > /dev/null
echo '
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
' | tee /etc/apt/preferences.d/mozilla
apt-get update
apt-get install firefox -y
# Install 'pulseaudio' package to support WebRTC audio streams
apt -y install pulseaudio
echo "$(firefox -version)" >> $KATALON_VERSION_FILE

echo "Upgrade Google Chrome"
chrome_package='google-chrome-stable_current_amd64.deb'
wget -O $chrome_package  https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i $chrome_package || apt -y -f install
rm $chrome_package
./wrap_chrome_binary.sh
echo "$(google-chrome --version)" >> $KATALON_VERSION_FILE || true

echo "Upgrade Edge Chromium"
microsoft_edge_package='microsoft-edge-stable_current_amd64.deb'
wget -O $microsoft_edge_package https://go.microsoft.com/fwlink?linkid=2149051
dpkg -i $microsoft_edge_package || apt -y -f install
rm $microsoft_edge_package
./wrap_edge_chromium_binary.sh
echo "$(microsoft-edge --version)" >> $KATALON_VERSION_FILE || true
