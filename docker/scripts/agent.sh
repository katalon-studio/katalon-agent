#!/bin/bash

set -x
# Skip set -e to save the reports

echo "Starting Agent"

cat $KATALON_VERSION_FILE

cd $KATALON_AGENT_DIR

./cli-linux-x64 config --server-url "$SERVER_URL" --username "$KATALON_USERNAME" --apikey "$KATALON_API_KEY" --teamid "$TEAM_ID" --agent-name "$AGENT_NAME"
args=("./cli-linux-x64" "$@")

xvfb-run -s "-screen 0 $DISPLAY_CONFIGURATION" "${args[@]}"
ret_code=$?

exit $ret_code
