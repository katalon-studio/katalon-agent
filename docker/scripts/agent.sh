#!/bin/bash

set -x
# Skip set -e to save the reports

echo "Starting Agent"

cat $KATALON_VERSION_FILE

cd $KATALON_AGENT_DIR

./cli-linux-x64 config \
    --server-url "$SERVER_URL" \
    --apikey "$KATALON_API_KEY" \
    --organizationid "$ORGANIZATION_ID" \
    --agent-name "$AGENT_NAME" \
    --proxy "$PROXY" \
    --proxy-exclude-list "$PROXY_EXCLUDE_LIST" \
    --log-level "$LOG_LEVEL" \
    --xvfb-run "$XVFB_RUN" \
    --x11-display "$X11_DISPLAY" \
    --keep-files "$KEEP_FILES" \
    --no-keep-files "$NO_KEEP_FILES"
args=("./cli-linux-x64" "$@")

xvfb-run -e /dev/stdout -s "-screen 0 $DISPLAY_CONFIGURATION" -a "${args[@]}"
ret_code=$?

exit $ret_code
