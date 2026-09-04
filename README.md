# CCIP

## Claude Code plugins

This project auto-registers the [Superpowers](https://github.com/obra/superpowers) marketplace and enables the `superpowers` plugin for anyone who opens this repo in Claude Code (see `.claude/settings.json`). Superpowers adds a skills library covering TDD, systematic debugging, brainstorming/planning, and subagent-driven development workflows.

After trusting this folder in Claude Code, run `/plugin install superpowers@superpowers-marketplace` if it isn't installed automatically, then `/reload-plugins` to activate it.

## MCP servers

This project declares the [Context7](https://context7.com) MCP server in `.mcp.json`, giving Claude up-to-date, version-specific documentation for libraries used in this codebase. It works without an API key on a free tier; for higher rate limits, add a `CONTEXT7_API_KEY` header (get a key at [context7.com/dashboard](https://context7.com/dashboard)) either in `.mcp.json` or in `.claude/settings.local.json` if you'd rather not commit it.

This project also declares the [Firecrawl](https://firecrawl.dev) MCP server, which gives Claude web scraping, crawling, and search tools. It uses OAuth, so each collaborator authenticates individually with:

```bash
claude mcp login firecrawl
```

Claude Code will prompt to approve both project-scoped servers the first time you open the repo.
