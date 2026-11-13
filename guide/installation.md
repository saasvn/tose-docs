---
title: "Install the TOSE CLI"
description: "Install the @tosesh/tose CLI with npm, check the Node.js requirement and set up your API key."
---

# Installation

Install TOSE CLI on your system.

## Prerequisites

- **Node.js** 18.0.0 or higher
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

## Confirm Your Email {#confirm-your-email}

When you sign up with an email and password, TOSE emails a confirmation link to that address. You can use the account right away; only features that need a verified email, such as [linking an earlier tose.sh enquiry](/guide/link-enquiry), wait until you confirm.

1. Open the email from TOSE and select the confirmation link. It opens `/verify-email/<token>` on the dashboard.
2. Press **Confirm email address**. The link is only used when you press the button, so mail scanners that preview links cannot spend it.
3. When you see "Your email is verified", close the page. The link confirms the address but does not sign you in.

**Before you confirm**, **Settings** shows a "Confirm your email" card with a **Send confirmation email** button. **After you confirm**, the card disappears.

### Missing or expired link

- A link works once and expires after 24 hours. Sending a new one expires the older ones.
- Open **Settings** and press **Send confirmation email** to get a new link. You can request one a minute and five a day. Inside that limit you see "A confirmation email was sent recently"; check your inbox and spam folder, or try again later.
- If the page says the link was already used, expired or invalid, request a new one the same way.
- If the page says the link was sent to an address the account no longer uses (`email_changed`), request a new link for the current address.
- If the email provider is not set up on a self-hosted installation, the request fails with `503 email_unavailable`. Sign-up still succeeds.

### Accounts that skip this step

Accounts created with Google or GitHub need no link: the provider vouches for the address, and the card does not appear. Asking for a link anyway returns `409 provider_verified`. Signing in with the provider again refreshes the address. If you already confirmed, the request returns `200` with `email_verified: true`.

`GET /auth/me` reports `email_verified`. See [API errors](/api/errors#email-verification-codes) for the codes.

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
