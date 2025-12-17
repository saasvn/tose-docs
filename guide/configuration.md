# Configuration

Learn how to configure TOSE CLI for your needs.

## Configuration File

TOSE CLI stores configuration in a JSON file located at:

```
~/.tose/config.json
```

### Structure

```json
{
  "apiKey": "ws_xxxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

### Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `apiKey` | string | Your TOSE API key | Yes |
| `workspaceId` | string | Default workspace ID | No |
| `baseUrl` | string | API base URL | No |

## API Key

### Getting Your API Key

1. Log in to [TOSE Dashboard](https://tose.sh)
2. Navigate to **Settings** > **API Keys**
3. Click **Create New API Key**
4. Copy the key (starts with `ws_`)

### Setting API Key

#### Via Interactive Prompt

```bash
tose up
# Enter API key when prompted
```

#### Via Manual Configuration

```bash
mkdir -p ~/.tose
cat > ~/.tose/config.json << 'EOF'
{
  "apiKey": "ws_your_key_here"
}
EOF
```

#### Via Environment Variable

```bash
export TOSE_API_KEY="ws_xxxxx"
# Then manually create config
```

### API Key Types

**User-Scoped Keys**
- Can access multiple workspaces
- User must select workspace
- Good for personal use

**Workspace-Scoped Keys**
- Tied to specific workspace
- No workspace selection needed
- Good for team collaboration

### Security Best Practices

1. **Never commit API keys**

```bash
# Add to .gitignore
echo '*.tose' >> .gitignore
```

2. **Use environment variables in CI/CD**

```yaml
# GitHub Actions
env:
  TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
```

3. **Rotate keys regularly**

Generate new keys every 90 days from dashboard.

4. **Use different keys per environment**

- Development: Personal workspace key
- CI/CD: Dedicated automation key
- Production: Workspace-scoped key

## Workspace Configuration

### Default Workspace

Set default workspace to skip selection:

```json
{
  "apiKey": "ws_xxxxx",
  "workspaceId": "ws_123456"
}
```

### Clearing Workspace

To reset workspace selection:

```bash
# Edit config and remove workspaceId
nano ~/.tose/config.json
```

Or:

```bash
# Delete config entirely
rm ~/.tose/config.json
tose up  # Will re-prompt
```

## Custom API URL

Override the default API URL:

### Via Config File

```json
{
  "apiKey": "ws_xxxxx",
  "baseUrl": "https://custom-api.tose.sh"
}
```

### Via Environment Variable

```bash
export TOSE_API_URL="https://custom-api.tose.sh"
tose up
```

### Use Cases

- **Custom Deployment**: Self-hosted TOSE instance
- **Regional Endpoints**: Use closer API server
- **Development**: Test against staging API

## Configuration Management

### View Current Config

```bash
cat ~/.tose/config.json
```

### Backup Configuration

```bash
cp ~/.tose/config.json ~/.tose/config.json.backup
```

### Reset Configuration

```bash
rm ~/.tose/config.json
tose up  # Will create new config
```

### Multiple Configurations

For multiple accounts:

```bash
# Save configs
cp ~/.tose/config.json ~/.tose/config.personal.json
cp ~/.tose/config.json ~/.tose/config.work.json

# Switch configs
cp ~/.tose/config.work.json ~/.tose/config.json
```

Or use shell aliases:

```bash
# In ~/.bashrc or ~/.zshrc
alias tose-personal='TOSE_API_KEY=ws_personal_key tose'
alias tose-work='TOSE_API_KEY=ws_work_key tose'
```

## Troubleshooting

### Config File Not Found

Create the directory:

```bash
mkdir -p ~/.tose
```

### Permission Denied

Fix permissions:

```bash
chmod 700 ~/.tose
chmod 600 ~/.tose/config.json
```

### Invalid JSON

Validate JSON:

```bash
cat ~/.tose/config.json | python -m json.tool
```

### API Key Not Working

1. Verify key format (starts with `ws_`)
2. Check key hasn't been revoked in dashboard
3. Ensure no extra spaces or newlines
4. Try generating new key

### Workspace Issues

If workspace selection fails:

```bash
# Remove cached workspace
jq 'del(.workspaceId)' ~/.tose/config.json > ~/.tose/config.tmp.json
mv ~/.tose/config.tmp.json ~/.tose/config.json
```

## Advanced Configuration

### Per-Project Configuration

While TOSE CLI doesn't support per-project configs yet, you can use shell scripts:

```bash
#!/bin/bash
# deploy-staging.sh

export TOSE_API_KEY="ws_staging_key"
export TOSE_API_URL="https://staging-api.tose.sh"

tose up --project staging-app
```

### CI/CD Configuration

Example for GitHub Actions:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup TOSE Config
        env:
          TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
        run: |
          mkdir -p ~/.tose
          echo "{\"apiKey\":\"$TOSE_API_KEY\"}" > ~/.tose/config.json

      - name: Deploy
        run: |
          npm install -g @tosesh/tose
          tose up
```

## Configuration Schema

Full configuration schema:

```typescript
interface ToseConfig {
  // Required: Your API key
  apiKey: string

  // Optional: Default workspace ID
  workspaceId?: string

  // Optional: Custom API base URL
  baseUrl?: string
}
```

### Validation

TOSE CLI validates configuration on startup:

- `apiKey` must be present and start with `ws_`
- `baseUrl` must be valid URL if provided
- `workspaceId` must start with `ws_` if provided

## Related Topics

- [Installation](/guide/installation) - Initial setup
- [Getting Started](/guide/getting-started) - First-time configuration
- [Environment Variables](/guide/environment) - Managing env vars
- [API Authentication](/api/authentication) - API key details
