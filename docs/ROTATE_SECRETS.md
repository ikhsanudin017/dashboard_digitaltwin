# Rotation Playbook — dashboard_digitaltwin

This document describes step-by-step actions to rotate all credentials that may have been exposed. Follow the checklist and use `scripts/rotate_secrets.sh` as a helper template. Always keep backups and rotate in a safe order.

## High-level order (recommended)
1. Rotate server-side credentials first (Storage account keys, Function host keys, IoT Hub policies).
2. Create new tokens/keys and update runtime configuration (Function App settings, RPi env, CI/CD secrets).
3. Verify services are functional with new keys.
4. Revoke old keys/tokens once verification completes.
5. Rebuild frontend and verify compiled assets do not embed secrets.
6. Run repo scanning tools to validate no remaining secrets.

## Quick checklist
- [ ] Azure Storage account (`stordigitaltwin2026v2`) — regenerate key(s) and update connection strings
- [ ] Azure Function keys — create new function/host keys and update callers
- [ ] IoT Hub/device keys — rotate device keys or create new policy
- [ ] InfluxDB token — create new token and update RPi service
- [ ] GitHub Actions secrets — update repository secrets (INFLUX_TOKEN, AZURE_STORAGE_CONNECTION_STRING, etc.)
- [ ] Vercel / hosting envs — update any `VITE_` envs
- [ ] Raspberry Pi local envs — update `/etc/digitaltwin.env` and restart services
- [ ] Rebuild frontend (`view_virtual`) and verify
- [ ] Re-run GitHub secret scan or `gitleaks` across repo history

## Platform-specific instructions

### Azure Storage
Use Azure Portal or CLI to regenerate primary or secondary key. Replace the connection string in all runtime environments.

CLI example:
```bash
# rotate primary key
az storage account keys renew --resource-group <RG> --account-name stordigitaltwin2026v2 --key primary
# get new connection string
az storage account show-connection-string --resource-group <RG> --name stordigitaltwin2026v2 -o tsv
```
Update:
- Function App setting: `AZURE_STORAGE_CONNECTION_STRING`
- Any scripts that used connection string

### Azure Functions (Function host & function keys)
Best to use Azure Portal: Function App → Functions → select function → Manage → Add new key. Update callers with the new key and then delete old key.

If you must use CLI/REST, verify RBAC and use `az rest` against the management API (advanced).

### IoT Hub and devices
Portal: IoT Hub → Shared access policies / Devices → rotate policy or per-device key.

### InfluxDB v2
Use the InfluxDB UI or CLI to create a new token with the required permissions and revoke the old one.

CLI example (requires `influx` CLI config / admin token):
```bash
influx auth create --org "digitaltwin" --description "rotated-$(date +%Y%m%d)" --write-buckets --read-buckets
influx auth delete --id <old-token-id>
```

### GitHub Actions
Replace repository secrets via `gh` CLI or repo Settings → Secrets.
Example:
```bash
echo -n "$NEW_INFLUX_TOKEN" | gh secret set INFLUX_TOKEN --repo ikhsanudin017/dashboard_digitaltwin
```

### Vercel / Hosting
Use the hosting provider's dashboard or CLI to update `VITE_*` env vars and redeploy.

### Raspberry Pi
SSH to the Pi, update `/etc/digitaltwin.env` (or your environment file), restart the service(s):
```bash
sudo systemctl restart ml_pipeline.service
```

### Frontend verification
Rebuild and scan production assets for any secret strings:
```bash
cd view_virtual
npm ci
npm run build
rg "SKs|AccountKey=|VITE_" dist || true
```

## Final verification
- Run `gitleaks` (or similar) locally to scan working tree and history.
- Confirm with `rg` that no known patterns remain.

---

If you want, I can run some of these CLI steps for you now (if you are logged in and authorize), or I can generate a fully-parameterized script you can run on a bastion host. Tell me which approach you prefer.
