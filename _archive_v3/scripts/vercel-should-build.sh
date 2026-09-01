#!/usr/bin/env bash
#
# Vercel `ignoreCommand`: exit 0 skips the build, exit 1 runs it.
#
# The Hobby plan allows 100 deployments a day and every push to every branch
# spends one. A day of ordinary work on docs, tests and CI config can burn the
# quota without a single line of shipped code changing — and once it is gone the
# only option is to wait.
#
# So: build only when the diff touches something that can actually change what
# the deployed app does. When in doubt, build. A wasted deployment costs one
# unit; a skipped deployment that should have run costs a broken production.
set -uo pipefail

build() { echo "BUILD: $1"; exit 1; }
skip()  { echo "SKIP: $1";  exit 0; }

# Vercel clones shallow. Without a parent commit there is nothing to diff
# against, so the safe answer is to build.
git rev-parse HEAD^ >/dev/null 2>&1 || build "no parent commit to compare against"

# Paths that cannot affect the running app. Everything else can.
CHANGED=$(git diff --name-only HEAD^ HEAD -- \
  ':(exclude)*.md' \
  ':(exclude)**/*.md' \
  ':(exclude)_bmad-output/**' \
  ':(exclude).agents/**' \
  ':(exclude).github/**' \
  ':(exclude)tests/**' \
  ':(exclude)supabase/tests/**' \
  ':(exclude)LICENSE' \
  ':(exclude).gitignore')

if [ -z "$CHANGED" ]; then
  skip "only docs, tests or CI config changed"
fi

build "changed: $(echo "$CHANGED" | head -3 | tr '\n' ' ')"
