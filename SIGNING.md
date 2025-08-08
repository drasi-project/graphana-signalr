# Plugin Signing Troubleshooting Guide

## 403 Error Solutions

### Step 1: Check Your Access Token

1. **Go to Grafana.com**: https://grafana.com/developers/plugins
2. **Sign in** to your Grafana.com account
3. **Create or regenerate** your Access Policy Token
4. **Ensure the token has PLUGIN permissions** (not just API access)

### Step 2: Set Environment Variables

```bash
# Option A: Export in your shell
export GRAFANA_ACCESS_POLICY_TOKEN="your_token_here"

# Option B: Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env file with your actual token
```

### Step 3: Verify Plugin ID Uniqueness

Your plugin ID: `drasi-signalr-datasource`

Check if this ID conflicts:
- Search the [Grafana Plugin Catalog](https://grafana.com/grafana/plugins/)
- If it exists, you may need to change your plugin ID in `src/plugin.json`

### Step 4: Run Signing Command

```bash
# Build first
npm run build

# Then sign
npm run sign
```

### Common 403 Error Causes:

1. **Invalid Token**: Token expired or has wrong permissions
2. **Plugin ID Conflict**: Another plugin already uses this ID
3. **Missing Build**: Trying to sign without building first
4. **Wrong Account**: Token from different account than plugin owner

### Step 5: Alternative Signing Method

If the above fails, try direct signing:

```bash
# Install signing tool globally
npm install -g @grafana/sign-plugin

# Sign directly
npx @grafana/sign-plugin --rootUrls https://your-grafana-instance.com
```

### Step 6: Debug Mode

Run with debug output:

```bash
DEBUG=* npm run sign
```

## Still Getting 403?

1. **Check token permissions** on Grafana.com
2. **Try a different plugin ID** in plugin.json
3. **Contact Grafana support** if the issue persists
4. **Consider unsigned development** for testing (disable plugin signature verification)

## Development Without Signing (Local Only)

For local development, you can disable signature verification:

```bash
# In your Grafana config (grafana.ini)
[plugins]
allow_loading_unsigned_plugins = drasi-signalr-datasource
```