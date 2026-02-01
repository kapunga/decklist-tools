# GitHub MCP Server Setup

You can add the GitHub MCP server to Claude Code to work with issues, pull requests, and releases directly.

## Setup

```bash
claude mcp add github \
  --transport http \
  --url https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer $(gh auth token)"
```

This requires the [GitHub CLI](https://cli.github.com/) to be installed and authenticated (`gh auth login`).

## Available Capabilities

With the GitHub MCP server connected, Claude can:

- **Issues**: Create, read, update, and search issues
- **Pull Requests**: Create, review, merge, and list PRs
- **Releases**: View and create releases
- **Repository**: Browse files, commits, and branches

## Example Usage

Once connected, you can ask Claude things like:

- "Create an issue for adding Windows support"
- "List open pull requests"
- "What issues are labeled as bugs?"
- "Create a release for v0.2.0 with these notes"
