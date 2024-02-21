# Build agent
FROM node:14 as build

ARG KATALON_ROOT_DIR=/katalon
RUN mkdir -p $KATALON_ROOT_DIR

WORKDIR /katalon
COPY . .
RUN chmod a+x ./docker/scripts/build_agent.sh
RUN ./docker/scripts/build_agent.sh

# Build docker image
FROM katalonstudio/katalon:9.2.0

RUN apt-get update && \
    apt -y install openjdk-8-jdk

# Agent arguement
ARG AGENT_VERSION

# Common arguement
ARG KATALON_ROOT_DIR=/katalon
ARG KATALON_SCRIPT_DIR=$KATALON_ROOT_DIR/scripts
ARG KATALON_SOFTWARE_DIR=/opt

# System Environment
ENV KATALON_VERSION_FILE=$KATALON_ROOT_DIR/version
ENV KATALON_AGENT_DIR=$KATALON_ROOT_DIR/agent
ENV GRADLE_HOME=$KATALON_SOFTWARE_DIR/gradle-7
ENV GRADLE_BIN=$GRADLE_HOME/bin

# Katalon Environment
ENV ECLIPSE_SANDBOX='1.11'

# Xvfb Environment
ENV DISPLAY=':99'
ENV DISPLAY_CONFIGURATION='1024x768x24'

# Agent Environment
ENV AGENT_NAME='Katalon Agent'
ENV SERVER_URL='https://testops.katalon.io'
ENV KATALON_API_KEY=''
ENV ORGANIZATION_ID=''
ENV PROXY=''
ENV LOG_LEVEL='INFO'
ENV XVFB_RUN=''
ENV X11_DISPLAY=''
ENV KEEP_FILES=''
ENV NO_KEEP_FILES=''
ENV AUTO_UPGRADE_ENVIRONMENT=false

# PATH Environment
ENV PATH "$GRADLE_BIN:$PATH:$KATALON_AGENT_DIR"
RUN echo "PATH=\"$PATH\"" > /etc/environment

# Copy agent
WORKDIR $KATALON_AGENT_DIR
COPY --from=build /katalon/bin/cli-linux-x64 *.sh ./

# Copy script files
# RUN apt update && apt -y install openjdk-8-jdk && update-alternatives --set java /usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java

# Copy script files and setup
WORKDIR $KATALON_SCRIPT_DIR
COPY ./docker/scripts/wrap_chrome_binary.sh wrap_chrome_binary.sh
COPY ./docker/scripts/setup_environment.sh setup_environment.sh
COPY ./docker/scripts/upgrade_environment.sh upgrade_environment.sh
COPY ./docker/scripts/setup_agent.sh setup_agent.sh
COPY ./docker/scripts/setup.sh setup.sh
COPY ./docker/scripts/agent.sh agent.sh
RUN ./setup.sh

COPY ./docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN ["chmod", "+x", "/usr/local/bin/entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["agent.sh", "start-agent"]
