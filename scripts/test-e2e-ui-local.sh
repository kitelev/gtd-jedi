#!/bin/bash
set -e

echo "=== Building E2E Docker image ==="
DOCKER_BUILDKIT=1 docker build -f Dockerfile.e2e -t gtd-jedi-e2e:local .

echo "=== Running E2E UI tests in Docker ==="
mkdir -p test-results-e2e playwright-report-e2e

docker run --init --rm \
  -v "$PWD/test-results-e2e:/app/test-results-e2e" \
  -v "$PWD/playwright-report-e2e:/app/playwright-report-e2e" \
  -e CI=true \
  gtd-jedi-e2e:local \
  npx playwright test -c tests/e2e-ui/playwright-e2e.config.ts

echo "=== Done. Opening report ==="
npx playwright show-report playwright-report-e2e 2>/dev/null || echo "Report at playwright-report-e2e/"
