case `uname` in
  *Darwin*) OS="macos";;
  *) OS="linux";;
esac

case `uname -m` in
  *64*) BIN="cli-$OS-x64";;
  *) BIN="cli-$OS-x86";;
esac

CURRENT_DIR="$(cd "$(dirname "$BASH_SOURCE")"; pwd -P)"

${CURRENT_DIR}/${BIN} start-agent
