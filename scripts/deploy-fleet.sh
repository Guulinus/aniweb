#!/usr/bin/env bash
# Deploy the already-built .next/ + public/ to one or more fleet Pis over SSH
# (intended for Tailscale-reachable hosts, key-authenticated — see fleet.conf.example).
#
# Usage:
#   npm run build                        # build once locally, test it, confirm it's good
#   ./scripts/deploy-fleet.sh friend1     # push to a single Pi
#   ./scripts/deploy-fleet.sh friend1 friend2   # push to several
#   ./scripts/deploy-fleet.sh --all       # push to every Pi listed in fleet.conf
#
# This does NOT build or touch the main Pi (192.168.178.84) — that one keeps
# using the existing rsync+sshpass flow documented in AGENTS.md.

set -euo pipefail
cd "$(dirname "$0")/.."

CONF="scripts/fleet.conf"
if [ ! -f "$CONF" ]; then
  echo "Missing $CONF — copy scripts/fleet.conf.example to $CONF and fill in your Pis first."
  exit 1
fi

if [ ! -d ".next" ]; then
  echo "No .next/ build found — run 'npm run build' first and test it locally before deploying."
  exit 1
fi

# name -> "host dir" lookup, skipping comments/blank lines
declare -A TARGETS
while read -r name host dir; do
  [ -z "$name" ] && continue
  [[ "$name" == \#* ]] && continue
  TARGETS["$name"]="$host $dir"
done < "$CONF"

if [ "${1:-}" = "--all" ]; then
  names=("${!TARGETS[@]}")
else
  if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <fleet-name> [<fleet-name> ...] | --all"
    echo "Known targets: ${!TARGETS[*]}"
    exit 1
  fi
  names=("$@")
fi

for name in "${names[@]}"; do
  entry="${TARGETS[$name]:-}"
  if [ -z "$entry" ]; then
    echo "Unknown fleet target '$name' (known: ${!TARGETS[*]})"
    exit 1
  fi
  host="${entry%% *}"
  dir="${entry#* }"

  echo "=== Deploying to $name ($host:$dir) ==="
  rsync -av --timeout=60 .next/ "$host:$dir/.next/"
  rsync -av --timeout=60 public/ "$host:$dir/public/"
  ssh "$host" "sudo systemctl restart aniroll.service"

  echo "=== Verifying $name ==="
  sleep 6
  code=$(ssh "$host" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/")
  if [ "$code" != "200" ]; then
    echo "WARNING: $name returned HTTP $code after restart — check 'ssh $host sudo journalctl -u aniroll -n 50'"
  else
    echo "$name OK (HTTP 200)"
  fi
done
