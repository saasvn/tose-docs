# Installation

This guide will help you install TOSE CLI on your system.

## Prerequisites

Before installing TOSE CLI, ensure you have:

- **Node.js** version 14.0.0 or higher
- **npm** or **yarn** package manager
- **Git** (optional, for Git integration features)
- A **TOSE account** with an API key

::: tip Check Node.js Version
Run `node --version` to check your Node.js version. If you need to install or upgrade Node.js, visit [nodejs.org](https://nodejs.org/).
:::

## Install via npm

### Global Installation (Recommended)

Install TOSE CLI globally to use the `tose` command from anywhere:

```bash
npm install -g @tosesh/tose
```

Verify the installation:

```bash
tose --version
```

You should see output like:

```
1.0.0
```

### Local Installation

For project-specific installation:

```bash
npm install @tosesh/tose
```

Then use it via npx:

```bash
npx tose up
```

Or add scripts to your `package.json`:

```json
{
  "scripts": {
    "deploy": "tose up",
    "status": "tose status",
    "logs": "tose logs"
  }
}
```

## Install via Yarn

### Global Installation

```bash
yarn global add @tosesh/tose
```

### Local Installation

```bash
yarn add @tosesh/tose
```

## Verify Installation

After installation, verify TOSE CLI is working:

```bash
tose --help
```

You should see the help output:

```
Usage: tose [options] [command]

TOSE CLI - Deploy and manage your applications

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  up              Deploy or manage your project
  status          Check deployment status
  logs            View deployment logs
  down            Stop deployment
  help [command]  display help for command
```

## Getting Your API Key

To use TOSE CLI, you need an API key:

1. Sign up or log in at [https://tose.sh](https://tose.sh)
2. Navigate to **Settings** > **API Keys**
3. Click **Create New API Key**
4. Copy the key (starts with `ws_`)
5. Keep it secure - you'll need it for first-time setup

::: warning Keep Your API Key Safe
Never commit your API key to version control or share it publicly. TOSE CLI stores it securely in `~/.tose/config.json`.
:::

## First-Time Setup

On your first run, TOSE CLI will prompt for your API key:

```bash
tose up
```

Follow the prompts:

1. **Enter API Key**: Paste your API key
2. **Select Workspace**: Choose or create a workspace
3. Continue with deployment setup

The API key and workspace preference will be saved locally for future use.

## Configuration Location

TOSE CLI stores configuration in:

```
~/.tose/config.json
```

Example configuration:

```json
{
  "apiKey": "ws_xxxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

## Updating TOSE CLI

To update to the latest version:

### npm

```bash
npm update -g @tosesh/tose
```

### yarn

```bash
yarn global upgrade @tosesh/tose
```

Check the new version:

```bash
tose --version
```

## Uninstalling

To remove TOSE CLI:

### npm

```bash
npm uninstall -g @tosesh/tose
```

### yarn

```bash
yarn global remove @tosesh/tose
```

Optionally, remove the configuration:

```bash
rm -rf ~/.tose
```

## Troubleshooting

### Command Not Found

If you get `tose: command not found` after global installation:

**On macOS/Linux:**

1. Check npm global bin path:
   ```bash
   npm config get prefix
   ```

2. Add to your PATH in `~/.bashrc` or `~/.zshrc`:
   ```bash
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

3. Reload your shell:
   ```bash
   source ~/.bashrc  # or ~/.zshrc
   ```

**On Windows:**

1. Check npm global path:
   ```cmd
   npm config get prefix
   ```

2. Add the path to your system's PATH environment variable

### Permission Errors

If you get permission errors on macOS/Linux:

```bash
sudo npm install -g @tosesh/tose
```

Or configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Network Issues

If installation fails due to network issues:

1. Try using a different npm registry:
   ```bash
   npm install -g @tosesh/tose --registry=https://registry.npmjs.org/
   ```

2. Check your proxy settings:
   ```bash
   npm config get proxy
   npm config get https-proxy
   ```

### Module Not Found

If you encounter module errors after installation:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install -g @tosesh/tose
```

## Development Installation

For contributing or local development:

```bash
# Clone the repository
git clone https://github.com/tosesh/tose-cli.git
cd tose-cli

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link locally
npm link

# Now you can use 'tose' globally
tose --version
```

## Next Steps

Now that TOSE CLI is installed:

1. [Get Started](/guide/getting-started) - Deploy your first application
2. [Commands Overview](/commands/overview) - Learn about available commands
3. [Configuration](/guide/configuration) - Configure TOSE CLI

## Support

Having trouble with installation?

- Check [GitHub Issues](https://github.com/tosesh/tose/issues)
- Email: tobi@wearetopgroup.com
- Review [Troubleshooting](/guide/troubleshooting) guide
