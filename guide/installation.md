# Installation

Install TOSE CLI on your system.

## Prerequisites

- **Node.js** 14.0.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Git** (for deployment features)
- A **TOSE account** with an API key

::: tip Check Node.js Version
```bash
node --version
# v18.0.0 or higher recommended
```
:::

## Install via npm (Recommended)

```bash
npm install -g @tosesh/tose
```

## Install via yarn

```bash
yarn global add @tosesh/tose
```

## Install via pnpm

```bash
pnpm add -g @tosesh/tose
```

## Verify Installation

```bash
$ tose --version
0.1.0
```

```bash
$ tose --help

Usage: tose [options] [command]

TOSE CLI - Deploy and manage your applications

Options:
  --json                 Output JSON (for scripting/AI agents)
  -y, --yes              Skip confirmation prompts
  --api-key <key>        Override API key
  --workspace <slug>     Override workspace
  --project <slug>       Override project
  -V, --version          Output the version number
  -h, --help             Display help for command

Commands:
  login                  Save API key
  logout                 Remove credentials
  whoami                 Show user/workspace info
  init                   Link directory to project
  use [project]          Set active project
  up                     Smart deploy
  deploy [project]       Deploy project
  redeploy [project]     Redeploy (no rebuild)
  down [project]         Stop deployment
  restart [project]      Restart pods
  status [project]       Show project status
  logs [project]         View logs
  open [project]         Open in browser
  env                    Manage environment variables
  domain                 Manage domains
  db                     Manage databases
  generate               Generate Dockerfile with AI
  help [command]         Display help for command
```

## Local Installation (Per Project)

For project-specific usage:

```bash
npm install @tosesh/tose
```

Use with npx:

```bash
npx tose up
```

Or add to `package.json` scripts:

```json
{
  "scripts": {
    "deploy": "tose deploy",
    "status": "tose status"
  }
}
```

## Getting Your API Key

1. Sign up or log in at [tose.sh](https://tose.sh)
2. Navigate to **Settings** > **API Keys**
3. Click **Create New API Key**
4. Copy the key (starts with `tose_sk_`)

## First-Time Setup

```bash
$ tose login

? Enter your TOSE API key: tose_sk_xxxxxxxxxxxx
✓ API key verified
Default workspace: my-workspace
Logged in! API key saved to ~/.tose/config.json
```

Your credentials are stored at `~/.tose/config.json` and used for all future commands.

## Updating

```bash
npm update -g @tosesh/tose
```

## Uninstalling

```bash
npm uninstall -g @tosesh/tose

# Optionally remove config
rm -rf ~/.tose
```

## Development Installation

For contributing to TOSE CLI:

```bash
git clone https://github.com/tosesh/tose-cli.git
cd tose-cli
npm install
npm run build
npm link
```

## Troubleshooting

### Command Not Found

If `tose` is not found after installation:

```bash
# Check npm global bin path
npm config get prefix

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH="$PATH:$(npm config get prefix)/bin"
source ~/.bashrc
```

### Permission Errors

```bash
# Option 1: Use sudo
sudo npm install -g @tosesh/tose

# Option 2: Fix npm prefix (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @tosesh/tose
```

### Network Issues

```bash
npm install -g @tosesh/tose --registry=https://registry.npmjs.org/
```

## Next Steps

- [Getting Started](/guide/getting-started) - Deploy your first application
- [Commands Overview](/commands/overview) - Learn all available commands
- [Configuration](/guide/configuration) - Configure TOSE CLI
