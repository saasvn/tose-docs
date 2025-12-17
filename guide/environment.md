# Environment Variables

Manage environment variables in your deployments with TOSE CLI.

## Overview

TOSE CLI provides powerful environment variable management with:

- Multi-file `.env` support
- Automatic file detection
- Intelligent merging with conflict detection
- Sensitive value masking
- File categorization

## .env File Support

### Supported File Patterns

TOSE CLI automatically detects these file patterns:

```
.env
.env.local
.env.development
.env.production
.env.staging
.env.test
```

### File Discovery

TOSE CLI searches your project directory recursively:

```bash
$ tose up

✓ Found 3 .env files:
  - .env (5 variables)
  - .env.local (3 variables)
  - .env.production (12 variables)
```

## Multi-File Selection

Select one or multiple files:

```bash
? Select .env files to include:
  ❯◉ .env (5 variables)
   ◉ .env.production (12 variables)
   ◯ .env.local (3 variables)
```

**Navigation:**
- Use arrow keys to navigate
- Press Space to select/deselect
- Press Enter to confirm

## File Merging

### Merge Order

Files are merged in selection order. Later files override earlier ones:

```
.env           →  BASE_URL=http://localhost
.env.production →  BASE_URL=https://api.prod.com  (overrides)
```

Result: `BASE_URL=https://api.prod.com`

### Conflict Detection

TOSE CLI warns about conflicts:

```
⚠️  Conflicts detected:
  - BASE_URL (defined in .env and .env.production)
  - API_KEY (defined in .env.local and .env.production)
```

## Variable Preview

Preview variables before deployment:

```
Environment Variables (13 total):

NODE_ENV=production
API_URL=https://api.example.com
DATABASE_URL=postgres://... (masked)
JWT_SECRET=****** (masked)
PORT=3000
LOG_LEVEL=info
... (7 more variables)
```

## Sensitive Value Masking

TOSE CLI automatically masks sensitive values containing:

- `PASSWORD`
- `SECRET`
- `TOKEN`
- `API_KEY`
- `PRIVATE_KEY`
- `AUTH`
- `CREDENTIAL`

Example:

```bash
# Visible
PORT=3000
NODE_ENV=production

# Masked
DATABASE_PASSWORD=****** (masked)
JWT_SECRET=****** (masked)
API_KEY=****** (masked)
```

## Best Practices

### 1. File Organization

```
.env                  # Development defaults
.env.local           # Local overrides (gitignored)
.env.production      # Production values
.env.staging         # Staging values
.env.test            # Test values
```

### 2. Git Ignore

```bash
# .gitignore
.env.local
.env*.local
.env.production
.env.staging
```

### 3. Variable Naming

Use clear, uppercase names:

```bash
# Good
DATABASE_URL=postgres://...
API_KEY=abc123
JWT_SECRET=secret123

# Avoid
db=postgres://...
key=abc123
```

### 4. Environment-Specific Files

```bash
# Local development
tose up  # Select .env + .env.local

# Production
tose up  # Select .env + .env.production

# Staging
tose up  # Select .env + .env.staging
```

### 5. Required Variables

Document required variables:

```bash
# .env.example
DATABASE_URL=
API_KEY=
JWT_SECRET=
PORT=3000
```

## File Format

### Syntax

```bash
# Comments are supported
KEY=value

# No quotes needed (but supported)
KEY="value"
KEY='value'

# Multiline values
KEY="line 1
line 2"

# Empty values
EMPTY=
```

### Special Characters

```bash
# Spaces in values
NAME=John Doe

# URLs
API_URL=https://api.example.com/v1

# Paths
DATA_PATH=/var/data/app
```

## Common Workflows

### Local Development

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://localhost/myapp_dev

# .env.local (gitignored)
DATABASE_URL=postgres://localhost/myapp_dev_john
DEBUG=true
```

Deploy:
```bash
tose up
# Select .env and .env.local
```

### Production Deployment

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://prod-server/myapp
API_URL=https://api.prod.com
LOG_LEVEL=error
```

Deploy:
```bash
tose up
# Select .env and .env.production
```

### Multiple Environments

```bash
# Development
tose up
# Select .env + .env.development

# Staging
tose up
# Select .env + .env.staging

# Production
tose up
# Select .env + .env.production
```

## Updating Variables

### Via tose up

```bash
tose up
# Select "Update configuration"
# Change .env file selections
# Or edit files and re-select
```

### Via Dashboard

1. Log in to dashboard
2. Navigate to project
3. Go to **Settings** > **Environment Variables**
4. Edit variables manually

## Troubleshooting

### No .env Files Found

If no files are detected:

```bash
# Check files exist
ls -la .env*

# Verify file names
# Must match: .env, .env.local, .env.production, etc.
```

### Variables Not Applied

If variables don't work:

1. Check file was selected during deployment
2. Verify variable names are correct
3. Redeploy to apply changes:
   ```bash
   tose up
   # Select "Redeploy"
   ```

### Sensitive Values Exposed

If sensitive values show in logs:

- Use masked naming: `PASSWORD`, `SECRET`, `KEY`
- Check application logs (not CLI logs)
- Report security issues immediately

## Related Topics

- [Configuration](/guide/configuration) - TOSE CLI configuration
- [Getting Started](/guide/getting-started) - Deployment guide
- [tose up](/commands/up) - Deployment command
