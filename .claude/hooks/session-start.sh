#!/bin/bash
set -euo pipefail

# Only needed in Claude Code on the web (cloud) sessions: a fresh container
# never went through the interactive /plugin trust-and-install flow, so
# enabledPlugins/extraKnownMarketplaces in settings.json alone don't load
# the plugin. Installing it here, before the session's tool list is built,
# makes it available from the first turn.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

claude plugin marketplace add obra/superpowers-marketplace
claude plugin install superpowers@superpowers-marketplace --scope project --yes
