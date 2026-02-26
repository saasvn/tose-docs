---
layout: home

hero:
  name: TOSE CLI
  text: Deploy and manage your applications
  tagline: A powerful command-line tool for deploying applications to the TOSE platform. Built with TypeScript.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Installation
      link: /guide/installation
    - theme: alt
      text: Command Reference
      link: /commands/overview

features:
  - title: Smart Deploy
    details: One command to initialize, connect Git, push env vars, and deploy. tose up handles everything automatically.
  - title: Environment Management
    details: Push, pull, set, and manage environment variables with tose env commands. Sync between local .env files and your deployments.
  - title: Real-time Monitoring
    details: Stream build logs, view live application logs, and check pod health with tose logs and tose status.
  - title: Custom Domains & Databases
    details: Add custom domains with automatic SSL, and create managed databases (PostgreSQL, MySQL, Redis, MongoDB).
  - title: AI Dockerfile Generation
    details: Auto-detect your project's language and framework, then generate an optimized Dockerfile with tose generate.
  - title: JSON Output
    details: All commands support --json for machine-readable output. Integrate with CI/CD pipelines and automation tools.
---

# What is TOSE CLI?

TOSE CLI (`@tosesh/tose`) is a command-line tool that simplifies application deployment and management on the TOSE platform.

## Quick Start

```bash
# Install
npm install -g @tosesh/tose

# Login
tose login

# Deploy your project
cd my-app
tose up
```

## All Commands

### Authentication
```bash
tose login                              # Save API key
tose logout                             # Remove credentials
tose whoami                             # Show user info
```

### Project Setup
```bash
tose init                               # Link directory to project
tose use [workspace/project]            # Set active project globally
```

### Deployment
```bash
tose up                                 # Smart deploy (init + git + env + deploy)
tose deploy [project]                   # Trigger deployment
tose redeploy [project]                 # Redeploy without rebuild
tose down [project]                     # Stop deployment
tose restart [project]                  # Restart pods
```

### Monitoring
```bash
tose status [project]                   # Project status and pod health
tose logs [project] --build -f          # Stream build logs
tose logs [project] -f                  # Stream live logs
tose open [project]                     # Open URL in browser
```

### Environment Variables
```bash
tose env list                           # List variables
tose env set KEY=VALUE [KEY=VALUE...]   # Set variables
tose env rm KEY [KEY...]                # Remove variables
tose env push [file]                    # Push .env file
tose env pull [file]                    # Pull to .env file
```

### Domains & Databases
```bash
tose domain list                        # List domains
tose domain add <domain>                # Add custom domain
tose domain rm <domain>                 # Remove domain
tose db list                            # List databases
tose db create                          # Create database
tose db info <name>                     # Show connection info
```

### Utilities
```bash
tose generate                           # Generate Dockerfile with AI
```

## Global Options

```bash
--json                 # JSON output for scripting
-y, --yes              # Skip confirmations
--api-key <key>        # Override API key
--workspace <slug>     # Override workspace
--project <slug>       # Override project
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 14+
- **CLI Framework**: Commander.js
- **API**: REST + WebSocket (for log streaming)
- **Package**: `@tosesh/tose` on npm
