#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VAULT_DIR="$REPO_ROOT/tests/e2e-ui/test-vault"
PLUGIN_DIR="$VAULT_DIR/.obsidian/plugins/exocortex"

echo "=== Setting up E2E test vault ==="
echo "Repo root: $REPO_ROOT"
echo "Vault dir: $VAULT_DIR"

# 1. Download Exocortex plugin from GitHub release
echo "--- Downloading Exocortex plugin ---"
mkdir -p "$PLUGIN_DIR"

if [ -f "$PLUGIN_DIR/main.js" ] && [ -f "$PLUGIN_DIR/manifest.json" ]; then
  echo "Plugin already downloaded, skipping."
else
  EXOCORTEX_REPO="kitelev/exocortex"

  if command -v gh &>/dev/null; then
    LATEST_TAG=$(gh api "repos/$EXOCORTEX_REPO/releases/latest" --jq .tag_name 2>/dev/null || echo "")
    if [ -n "$LATEST_TAG" ]; then
      echo "Downloading $LATEST_TAG from $EXOCORTEX_REPO..."
      gh release download "$LATEST_TAG" -R "$EXOCORTEX_REPO" -p "main.js" -p "manifest.json" -D "$PLUGIN_DIR" --clobber
    else
      echo "ERROR: Could not determine latest release tag"
      exit 1
    fi
  else
    echo "ERROR: gh CLI not found. Install: https://cli.github.com/"
    exit 1
  fi
fi

echo "Plugin files:"
ls -lh "$PLUGIN_DIR"/main.js "$PLUGIN_DIR"/manifest.json

# 2. Copy gtd-jedi ontology files into vault
echo "--- Copying ontology files ---"
for dir in buttons commands dashboards prototypes workflow-classes ontology; do
  rm -rf "$VAULT_DIR/$dir"
  cp -r "$REPO_ROOT/$dir" "$VAULT_DIR/$dir"
  echo "  Copied $dir/ ($(find "$VAULT_DIR/$dir" -name '*.md' | wc -l | tr -d ' ') files)"
done

# Copy ontology manifest
cp "$REPO_ROOT/!gtd-jedi.md" "$VAULT_DIR/!gtd-jedi.md"
echo "  Copied !gtd-jedi.md"

# 3. Verify vault structure
echo "--- Vault verification ---"
TOTAL_MD=$(find "$VAULT_DIR" -name '*.md' -not -path '*/.obsidian/*' | wc -l | tr -d ' ')
echo "Total .md files in vault: $TOTAL_MD"

if [ "$TOTAL_MD" -lt 40 ]; then
  echo "ERROR: Expected 40+ .md files, got $TOTAL_MD"
  exit 1
fi

echo "=== E2E vault ready ==="
