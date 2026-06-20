# Environment and Secrets Handling

This repository must not contain real secrets. Follow these steps to run and deploy safely.

1. Create a local `.env` file from `.env.example` and fill in real values per environment.

```bash
cp .env.example .env
# edit .env and fill values
```

2. On production (Azure, Vercel, GitHub Actions), set the same variables in the platform's secret/config settings instead of committing files.

3. If any secret was exposed before (committed), rotate it immediately (Azure Function keys, Storage Account keys, Influx token, IoT device keys, VITE tokens). Removing from git history is not sufficient without rotation.

4. Avoid force-adding private `.env` files. If you need to commit sanitized examples, use `.env.example` only.

5. Common commands:

- Remove local file from git tracking (if accidentally added):

```bash
git rm --cached path/to/file
git commit -m "chore: remove sensitive file from tracking"
```

- Rewrite history for known leak (advanced, use with caution and backups):

```bash
# Backup branch first
git branch backup/before-secret-cleanup-$(date +%Y%m%d)
# Use git-filter-repo or BFG to remove files/strings
```

6. After rotating secrets, update runtime envs (Azure Function App settings, RPi systemd unit environment, CI secrets, Vercel env vars).

