#!/usr/bin/env bash
set -euo pipefail

# Optional Ubuntu 22.04 local-dev helper.
# This script is not used by required cross-platform pnpm workflows.

NODE_MAJOR="24"
NVM_VERSION="v0.40.3"
START_MARKER="# >>> unofficial-codex-wiki local dev >>>"
END_MARKER="# <<< unofficial-codex-wiki local dev <<<"

AUTO_YES="false"
INSTALL_DEPS="false"
NO_INSTALL="false"

log() {
  printf '[unofficial-codex-wiki setup] %s\n' "$*"
}

warn() {
  printf '[unofficial-codex-wiki setup] warning: %s\n' "$*" >&2
}

die() {
  printf '[unofficial-codex-wiki setup] error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  scripts/for-local-dev/ubuntu/fast-env-setup_ubuntu-22.04.sh [--yes] [--install-deps] [--no-install]

Options:
  --yes           Do not prompt before installing nvm.
  --install-deps  Run pnpm install after Node/Corepack/pnpm are ready.
  --no-install    Do not install nvm or Node; only update shell rc files and verify tools.
  -h, --help      Show this help.

What it does:
  - Updates both ~/.bashrc and ~/.zshrc with one managed local-dev block.
  - Sets COREPACK_HOME to avoid Corepack cache directory failures.
  - Adds PNPM_HOME to PATH for both Bash and Zsh.
  - Installs/uses Node.js 24 through nvm unless --no-install is passed.
  - Enables Corepack and prepares the pnpm version from package.json.
USAGE
}

source_nvm() {
  if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    return 1
  fi

  local had_errexit="false"
  local had_nounset="false"
  case "$-" in
    *e*) had_errexit="true" ;;
  esac
  case "$-" in
    *u*) had_nounset="true" ;;
  esac

  # nvm is not safe to source under errexit/nounset in every environment.
  set +e
  set +u
  # shellcheck disable=SC1091
  . "${NVM_DIR}/nvm.sh"

  if [ "${had_errexit}" = "true" ]; then
    set -e
  fi
  if [ "${had_nounset}" = "true" ]; then
    set -u
  fi

  type nvm >/dev/null 2>&1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes)
      AUTO_YES="true"
      ;;
    --install-deps)
      INSTALL_DEPS="true"
      ;;
    --no-install)
      NO_INSTALL="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
  shift
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../../.." && pwd)"
cd "${repo_root}"

if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  if [ "${ID:-}" != "ubuntu" ] || [ "${VERSION_ID:-}" != "22.04" ]; then
    warn "This helper is intended for Ubuntu 22.04; detected ${PRETTY_NAME:-unknown OS}."
  fi
else
  warn "Could not read /etc/os-release to verify Ubuntu 22.04."
fi

if [ ! -f package.json ]; then
  die "Run this script from the unofficial-codex-wiki repository."
fi

package_manager="$(awk -F'"' '/"packageManager"/ { print $4; exit }' package.json)"
if [ -z "${package_manager}" ]; then
  die "Could not read packageManager from package.json."
fi

rc_block="$(cat <<'RC_BLOCK'
export COREPACK_HOME="${XDG_CACHE_HOME:-$HOME/.cache}/node/corepack"
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  unofficial_codex_wiki_had_nounset="false"
  case "$-" in
    *u*) unofficial_codex_wiki_had_nounset="true" ;;
  esac
  set +u 2>/dev/null || true
  . "$NVM_DIR/nvm.sh"
  if [ "$unofficial_codex_wiki_had_nounset" = "true" ]; then
    set -u 2>/dev/null || true
  fi
  unset unofficial_codex_wiki_had_nounset
fi
RC_BLOCK
)"

update_rc_file() {
  local rc_file="$1"
  local tmp_file

  mkdir -p "$(dirname "${rc_file}")"
  touch "${rc_file}"
  tmp_file="$(mktemp)"

  awk -v start="${START_MARKER}" -v end="${END_MARKER}" '
    $0 == start { skip = 1; next }
    $0 == end { skip = 0; next }
    skip != 1 { print }
  ' "${rc_file}" > "${tmp_file}"

  {
    cat "${tmp_file}"
    printf '\n%s\n%s\n%s\n' "${START_MARKER}" "${rc_block}" "${END_MARKER}"
  } > "${rc_file}"

  rm -f "${tmp_file}"
  log "Updated ${rc_file}"
}

update_rc_file "${HOME}/.bashrc"
update_rc_file "${HOME}/.zshrc"

export COREPACK_HOME="${XDG_CACHE_HOME:-$HOME/.cache}/node/corepack"
export PNPM_HOME="${HOME}/.local/share/pnpm"
export PATH="${PNPM_HOME}:${PATH}"
export NVM_DIR="${HOME}/.nvm"

mkdir -p "${COREPACK_HOME}" "${PNPM_HOME}"

if [ "${NO_INSTALL}" != "true" ]; then
  if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    command -v curl >/dev/null 2>&1 || die "curl is required to install nvm. Install curl or rerun with --no-install."

    if [ "${AUTO_YES}" != "true" ]; then
      printf 'Install nvm %s into %s? [y/N] ' "${NVM_VERSION}" "${NVM_DIR}"
      read -r answer
      case "${answer}" in
        y|Y|yes|YES)
          ;;
        *)
          die "nvm install cancelled. Re-run with --no-install to only update shell rc files."
          ;;
      esac
    fi

    log "Installing nvm ${NVM_VERSION}"
    PROFILE=/dev/null curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | PROFILE=/dev/null bash
  fi

  source_nvm || die "nvm could not be loaded from ${NVM_DIR}/nvm.sh."

  log "Installing and selecting Node.js ${NODE_MAJOR}"
  nvm install "${NODE_MAJOR}"
  nvm use "${NODE_MAJOR}"
  nvm alias default "${NODE_MAJOR}" >/dev/null
fi

node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
if [ "${node_major}" != "${NODE_MAJOR}" ]; then
  die "Node.js ${NODE_MAJOR} is required. Open a new shell or run: source ~/.bashrc or source ~/.zshrc"
fi

command -v corepack >/dev/null 2>&1 || die "corepack is required and should be bundled with Node.js ${NODE_MAJOR}."

log "Enabling Corepack"
corepack enable

log "Preparing ${package_manager}"
corepack prepare "${package_manager}" --activate

log "pnpm version: $(corepack pnpm --version)"

if [ "${INSTALL_DEPS}" = "true" ]; then
  log "Running pnpm install"
  corepack pnpm install
else
  log "Skipped dependency install. Run 'pnpm install' or 'corepack pnpm install' when ready."
fi

log "Done. Open a new Bash/Zsh shell, or source ~/.bashrc / ~/.zshrc, then run pnpm typecheck and pnpm test."
