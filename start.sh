case `arch` in
  *64*) BIN="cli-linux-x64";;
  *) BIN="cli-linux-x86";;
esac

CURRENT_DIR="$(cd "$(dirname "$BASH_SOURCE")"; pwd -P)"

${CURRENT_DIR}/${BIN} start-agent
