# What is TOSE CLI?

TOSE CLI is a powerful command-line tool that simplifies application deployment and management. Built with TypeScript and designed for developers, it provides an intuitive interface for deploying applications to the TOSE platform.

## Overview

TOSE CLI (`@tosesh/tose`) is a deployment automation tool that handles:

- **Project Management** - Create and manage multiple projects across workspaces
- **Git Integration** - Deploy directly from your Git repositories
- **Environment Configuration** - Manage environment variables with .env file support
- **Deployment Monitoring** - Real-time status checking and log streaming
- **Workspace Collaboration** - Team-based project management

## Key Capabilities

### 1. Interactive Deployment

TOSE CLI guides you through the deployment process with interactive prompts:

```bash
tose up
```

The CLI will automatically:
- Detect your Git repository and branch
- Find and merge multiple .env files
- Validate your configuration
- Deploy your application

### 2. Smart Defaults

TOSE CLI uses intelligent defaults to streamline your workflow:

- Auto-detects Git remote URL from current directory
- Defaults to `main` branch if available
- Uses port 3000 as default application port
- Caches API keys and workspace preferences

### 3. Real-time Feedback

Get instant feedback on your deployments:

```bash
# Check deployment status
tose status

# Stream logs in real-time
tose logs --follow

# View last 50 log entries
tose logs -n 50
```

## Architecture

TOSE CLI is built with a modular architecture:

```
┌─────────────────────────────────────┐
│         CLI Interface               │
│    (Commander.js + Enquirer)        │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│         Commands Layer              │
│   (up, status, logs, down)          │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│        Services Layer               │
│  (API Client, Deployment, Publish)  │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│        Utilities Layer              │
│  (Config, Git, Env, Validation)     │
└─────────────────────────────────────┘
```

## Core Features

### API Integration

TOSE CLI communicates with the TOSE API (`https://api.tose.sh`) using:

- RESTful API calls with `node-fetch`
- API key authentication via `X-API-KEY` header
- Automatic error handling and retry logic
- Support for both user-scoped and workspace-scoped keys

### Git Repository Management

Seamless Git integration with:

- Support for GitHub, GitLab, and Bitbucket
- Both HTTPS and SSH URL formats
- Branch auto-completion and validation
- Repository linking to projects

### Environment Variable Handling

Advanced environment variable management:

- Multi-file .env support (`.env`, `.env.local`, `.env.production`)
- Automatic merging with conflict detection
- Sensitive value masking (passwords, tokens, API keys)
- Preview before deployment

### Configuration Persistence

Local configuration storage at `~/.tose/config.json`:

```json
{
  "apiKey": "tose_sk_xxxxx...",
  "workspaceId": "ws_123...",
  "baseUrl": "https://api.tose.sh"
}
```

## Technology Stack

TOSE CLI is built with modern, reliable technologies:

- **Language**: TypeScript 5.9+
- **Runtime**: Node.js 14+
- **CLI Framework**: Commander.js 14.x
- **Prompts**: Enquirer 2.x
- **HTTP Client**: node-fetch 2.x
- **UI**: Chalk (colors) + Ora (spinners)

## Use Cases

### Personal Projects

Perfect for solo developers:
- Quick deployments from local development
- Simple project management
- Easy environment configuration

### Team Collaboration

Great for teams:
- Shared workspaces
- Multiple projects per workspace
- Workspace-scoped API keys
- Consistent deployment workflows

### CI/CD Integration

Can be integrated into automated pipelines:
- Scriptable commands
- Environment variable support
- Status checking for verification
- Log output for debugging

## Philosophy

TOSE CLI follows these design principles:

1. **Developer Experience First** - Interactive prompts, helpful errors, and smart defaults
2. **Safety by Default** - Confirmation prompts, configuration preview, and validation
3. **Transparency** - Clear feedback on operations and detailed logging
4. **Flexibility** - Support for various Git providers, environments, and workflows
5. **Performance** - Fast operations with caching and efficient API calls

## Version & Support

- **Current Version**: 0.0.2
- **License**: ISC
- **Package**: `@tosesh/tose` (npm)
- **Support**: tobi@wearetopgroup.com

## What's Next?

Ready to get started? Check out these guides:

- [Installation](/guide/installation) - Install TOSE CLI on your system
- [Getting Started](/guide/getting-started) - Deploy your first application
- [Commands Overview](/commands/overview) - Learn about all available commands
- [Configuration](/guide/configuration) - Configure TOSE CLI for your needs
