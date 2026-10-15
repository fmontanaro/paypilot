#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

# Restore the committed dependency tree, including build and test tools.
npm ci --include=dev --no-audit --no-fund
npm run check
npm test
npm run build

# Database schema changes require separate review; never apply them implicitly here.
