#!/bin/bash

set -xe

apt update

# echo "Install tools"
# apt -y install apt-utils
# apt -y install wget
# apt -y install unzip
# apt -y install curl
# apt -y install gosu

# echo "Install JRE"
# apt -y install default-jre

# echo "Install CircleCI tools"
# apt -y install git
# apt -y install ssh
# apt -y install tar
# apt -y install gzip
# apt -y install ca-certificates

# echo "Install Xvfb"
# apt -y install xvfb

# echo "Install fonts"
# apt -y install libfontconfig
# apt -y install libfreetype6
# apt -y install xfonts-cyrillic
# apt -y install xfonts-scalable
# apt -y install fonts-liberation
# apt -y install fonts-ipafont-gothic
# apt -y install fonts-wqy-zenhei
# apt -y install fonts-tlwg-loma-otf
# apt -y install ttf-ubuntu-font-family

# echo "Install Mozilla Firefox"
# apt -y install firefox
# # Install 'pulseaudio' package to support WebRTC audio streams
# apt -y install pulseaudio
# echo "$(firefox -version)" >> $KATALON_VERSION_FILE

# echo "Install Google Chrome"
# chrome_package='google-chrome-stable_current_amd64.deb'
# wget -O $chrome_package  https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
# dpkg -i $chrome_package || apt -y -f install
# rm $chrome_package
# echo "$(google-chrome --version)" >> $KATALON_VERSION_FILE || true

# ./wrap_chrome_binary.sh && rm -rfv ./wrap_chrome_binary.sh

echo "Install Gradle"
gradle_version='7.6.3'
gradle_package="gradle-$gradle_version-bin.zip"
gradle_unzipped_package="gradle-$gradle_version"
wget https://downloads.gradle.org/distributions/gradle-$gradle_version-bin.zip
ls
unzip $gradle_package
ls
rm $gradle_package
mv $gradle_unzipped_package /opt/gradle-7
ls $GRADLE_HOME

# chmod -R 777 $KATALON_ROOT_DIR
# chmod -R 777 $KATALON_SOFTWARE_DIR

# clean up

# echo "Clean up"
# apt clean all
# rm -rf /var/lib/apt/lists/*
# cat $KATALON_VERSION_FILE
