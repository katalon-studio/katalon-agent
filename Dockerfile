# Build agent
FROM node:10 as build

ARG KATALON_ROOT_DIR=/katalon
RUN mkdir -p $KATALON_ROOT_DIR

WORKDIR /katalon
COPY . .
RUN chmod a+x ./docker/scripts/build_agent.sh
RUN ./docker/scripts/build_agent.sh

# Build docker image
FROM ubuntu:16.04

# Agent arguement
ARG AGENT_VERSION

# Common arguement
ARG KATALON_ROOT_DIR=/katalon
ARG KATALON_SCRIPT_DIR=$KATALON_ROOT_DIR/scripts
ARG KATALON_SOFTWARE_DIR=/opt

# System Environment
ENV KATALON_VERSION_FILE=$KATALON_ROOT_DIR/version
ENV KATALON_AGENT_DIR=$KATALON_ROOT_DIR/agent
ENV GRADLE_HOME=$KATALON_SOFTWARE_DIR/gradle
ENV GRADLE_BIN=$GRADLE_HOME/bin

# Katalon Environment
ENV ECLIPSE_SANDBOX='1.11'

# Xvfb Environment
ENV DISPLAY=':99'
ENV DISPLAY_CONFIGURATION='1024x768x24'

# Agent Environment
ENV AGENT_NAME='Katalon Agent'
ENV SERVER_URL='https://testops.katalon.io'
ENV KATALON_USERNAME=''
ENV KATALON_API_KEY=''
ENV TEAM_ID=''

# Copy script files
RUN mkdir -p $KATALON_SCRIPT_DIR
WORKDIR $KATALON_SCRIPT_DIR
COPY ./docker/scripts/wrap_chrome_binary.sh wrap_chrome_binary.sh
COPY ./docker/scripts/setup_environment.sh setup_environment.sh
COPY ./docker/scripts/setup_agent.sh setup_agent.sh
COPY ./docker/scripts/agent.sh agent.sh
RUN chmod a+x wrap_chrome_binary.sh setup_environment.sh setup_agent.sh agent.sh

# Setup environment
RUN $KATALON_SCRIPT_DIR/setup_environment.sh

# Copy agent
WORKDIR $KATALON_AGENT_DIR
COPY --from=build /katalon/bin/cli-linux-x64 *.sh ./
RUN $KATALON_SCRIPT_DIR/setup_agent.sh

# PATH Environment
ENV PATH "$PATH:$KATALON_SCRIPT_DIR:$KATALON_AGENT_DIR:$GRADLE_BIN"
RUN echo "PATH=\"$PATH\"" > /etc/environment

WORKDIR /
COPY ./docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod a+x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["agent.sh", "start-agent"]