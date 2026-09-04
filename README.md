# CCIP

## Claude Code plugins

This project auto-registers the [Superpowers](https://github.com/obra/superpowers) marketplace and enables the `superpowers` plugin for anyone who opens this repo in Claude Code (see `.claude/settings.json`). Superpowers adds a skills library covering TDD, systematic debugging, brainstorming/planning, and subagent-driven development workflows.

This project also enables the [`figma`](https://claude.com/plugins) plugin from the official Anthropic marketplace, which bundles the Figma MCP server plus skills for design-to-code, generating designs/diagrams, motion, and FigJam/Slides workflows.

In a cloud (Claude Code on the web) session, `.claude/hooks/session-start.sh` installs both plugins automatically at session start — `enabledPlugins`/`extraKnownMarketplaces` in `.claude/settings.json` alone aren't enough in a headless environment, since that mechanism normally relies on the interactive "trust this folder" flow. In a local interactive session, run `/plugin install superpowers@superpowers-marketplace` and `/plugin install figma@claude-plugins-official` if they aren't installed automatically, then `/reload-plugins` to activate them.

Figma's MCP server needs authentication, same as Firecrawl below — each collaborator runs `claude mcp login plugin:figma:figma` (or approves it interactively) from their own session.

## MCP servers

This project declares the [Context7](https://context7.com) MCP server in `.mcp.json`, giving Claude up-to-date, version-specific documentation for libraries used in this codebase. It works without an API key on a free tier; for higher rate limits, add a `CONTEXT7_API_KEY` header (get a key at [context7.com/dashboard](https://context7.com/dashboard)) either in `.mcp.json` or in `.claude/settings.local.json` if you'd rather not commit it.

This project also declares the [Firecrawl](https://firecrawl.dev) MCP server, which gives Claude web scraping, crawling, and search tools. It uses OAuth, so each collaborator authenticates individually with:

```bash
claude mcp login firecrawl
```

Claude Code will prompt to approve both project-scoped servers the first time you open the repo.
