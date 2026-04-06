#!/bin/bash
set -e

export DOCKER=1
export CI=1
export DEBUG=pw:browser*

echo "=== E2E UI Test Environment ==="
echo "DISPLAY=$DISPLAY"
echo "OBSIDIAN_PATH=$OBSIDIAN_PATH"
echo "OBSIDIAN_VAULT=$OBSIDIAN_VAULT"
echo "==============================="

# Launch with virtual X11 display, filter harmless Chrome/dbus warnings
exec xvfb-run --auto-servernum "$@" 2> >(grep -v -E "dbus|Fluxbox|WARNING:MASTER" >&2)
