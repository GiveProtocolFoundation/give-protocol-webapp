#!/usr/bin/env bash
#
# Migration history preflight for the database deploy workflow.
#
# `supabase db push` applies every local migration that is not recorded in the
# remote `supabase_migrations.schema_migrations` table. If a project's schema
# was built by hand in the SQL editor, that table is empty or partial and a
# push would replay the entire history against a live database. This script
# refuses to let that happen silently.
#
# Reads the JSON emitted by `supabase migration list --db-url ... --output json`
# on stdin (or from the file given as $1) and classifies the remote history:
#
#   in-sync   every local migration is recorded remotely  -> exit 0
#   ahead     only newer migrations are missing remotely  -> exit 0
#   empty     nothing recorded remotely at all            -> exit 3
#   diverged  a gap: some migration older than the newest
#             remote one is missing remotely              -> exit 4
#   remote-only  remote records a migration that does not
#             exist locally                               -> exit 5
#
# "ahead" is the ordinary case for a healthy project and is the only state in
# which an unattended push is safe. Everything else needs a human.
#
# Env:
#   ALLOW_FULL_REPLAY=true  downgrade "empty" from a failure to a warning,
#                           for the deliberate first push to a fresh project.
#
# Usage:
#   supabase migration list --db-url "$URL" --output json \
#     | scripts/ci/migration-preflight.sh
#   scripts/ci/migration-preflight.sh captured.json

set -euo pipefail

INPUT="${1:--}"
ALLOW_FULL_REPLAY="${ALLOW_FULL_REPLAY:-false}"

if ! command -v jq >/dev/null 2>&1; then
  echo "preflight: jq is required but not installed" >&2
  exit 2
fi

raw="$(cat -- "$INPUT")"

# The CLI prints progress lines ("Connecting to remote database...") before the
# JSON payload, so keep only the line that actually parses as an object with a
# .migrations array.
json="$(printf '%s\n' "$raw" \
  | grep -E '^\{' \
  | while IFS= read -r line; do
      if printf '%s' "$line" | jq -e 'has("migrations")' >/dev/null 2>&1; then
        printf '%s' "$line"
        break
      fi
    done)"

if [ -z "$json" ]; then
  echo "preflight: no parseable migration list JSON found in input" >&2
  printf '%s\n' "$raw" | head -20 >&2
  exit 2
fi

# A migration is "applied remotely" when its .remote field is a non-empty
# version string. Local-only entries carry "".
total_local=$(printf '%s' "$json"   | jq '[.migrations[] | select((.local // "") != "")] | length')
applied=$(printf '%s' "$json"       | jq '[.migrations[] | select((.remote // "") != "")] | length')
pending=$(printf '%s' "$json"       | jq '[.migrations[] | select((.local // "") != "" and (.remote // "") == "")] | length')
remote_only=$(printf '%s' "$json"   | jq '[.migrations[] | select((.local // "") == "" and (.remote // "") != "")] | length')

# Newest version recorded remotely; "" when nothing is applied.
newest_remote=$(printf '%s' "$json" | jq -r '[.migrations[] | select((.remote // "") != "") | .remote] | max // ""')

# A gap is any local migration that is unapplied but *older* than something
# already applied remotely — the signature of a diverged history.
if [ -n "$newest_remote" ]; then
  gaps=$(printf '%s' "$json" | jq -r --arg newest "$newest_remote" \
    '[.migrations[] | select((.local // "") != "" and (.remote // "") == "" and (.local < $newest)) | .local] | join(", ")')
else
  gaps=""
fi

emit() { echo "$1"; [ -n "${GITHUB_OUTPUT:-}" ] && echo "$1" >> "$GITHUB_OUTPUT"; return 0; }

echo "── Migration history preflight ─────────────────────────────"
echo "  local migrations:      $total_local"
echo "  applied remotely:      $applied"
echo "  pending (to be run):   $pending"
echo "  newest remote version: ${newest_remote:-<none>}"
echo "  remote-only entries:   $remote_only"
echo

emit "total_local=$total_local"
emit "applied=$applied"
emit "pending=$pending"

if [ "$remote_only" -gt 0 ]; then
  emit "state=remote-only"
  echo "FAIL: the remote database records $remote_only migration(s) that do not exist in this"
  echo "      repository. Deploying from this branch could contradict what is already applied."
  echo "      Reconcile the histories before pushing (supabase migration list, then fetch or"
  echo "      repair the missing files)."
  exit 5
fi

if [ -n "$gaps" ]; then
  emit "state=diverged"
  echo "FAIL: remote migration history has gaps. These are unapplied but older than the"
  echo "      newest applied migration ($newest_remote):"
  echo "        $gaps"
  echo
  echo "      Pushing would run old migrations against a schema that has already moved past"
  echo "      them. Reconcile with 'supabase migration repair --status applied <version>'"
  echo "      for each migration already reflected in the schema, then re-run."
  exit 4
fi

if [ "$applied" -eq 0 ] && [ "$total_local" -gt 0 ]; then
  emit "state=empty"
  echo "The remote database has NO migration history recorded."
  echo "A push would replay all $total_local migrations against it."
  echo
  if [ "$ALLOW_FULL_REPLAY" = "true" ]; then
    echo "ALLOW_FULL_REPLAY=true — continuing. Only correct for a genuinely fresh project."
    exit 0
  fi
  echo "FAIL: refusing to replay the full history automatically."
  echo
  echo "      If this project's schema was built by hand, do NOT push. Record the already-"
  echo "      applied migrations first:"
  echo "        supabase migration repair --status applied <version>   # per migration"
  echo
  echo "      If this really is a brand-new empty project, re-run with"
  echo "      allow_full_replay enabled."
  exit 3
fi

if [ "$pending" -eq 0 ]; then
  emit "state=in-sync"
  echo "OK: remote history is in sync. Nothing to push."
  exit 0
fi

emit "state=ahead"
echo "OK: $pending migration(s) ahead of the remote database, all newer than $newest_remote."
exit 0
