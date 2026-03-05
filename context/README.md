# Context Store

Local memory store for strategies, plans, research, and critical documents.

## Structure

```
context/
├── strategies/   # Business and product strategies
├── plans/        # Execution plans and roadmaps
├── research/     # Market research, competitive analysis, technical findings
└── docs/         # Other critical documents
```

## Auto-Sync

This directory is monitored by `context/auto-sync.sh`. Any file added or changed is automatically committed and pushed to GitHub.

### Start the watcher

```bash
# Foreground (see logs)
./context/auto-sync.sh

# Background (via launchd — persists across reboots)
launchctl load ~/Library/LaunchAgents/com.thinksy.context-sync.plist
```

### Stop the watcher

```bash
launchctl unload ~/Library/LaunchAgents/com.thinksy.context-sync.plist
```
