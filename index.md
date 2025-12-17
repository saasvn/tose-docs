---
layout: home

hero:
  name: TOSE CLI
  text: Deployment Made Simple
  tagline: A powerful command-line tool for deploying and managing applications with ease
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Commands
      link: /commands/overview
    - theme: alt
      text: GitHub
      link: https://github.com/tosesh/tose

features:
  - icon: 🚀
    title: Fast Deployment
    details: Deploy your applications in seconds with smart Git integration and automatic configuration detection.
  - icon: 🔧
    title: Easy Configuration
    details: Interactive prompts guide you through setup. Multi-file .env support with intelligent merging and conflict detection.
  - icon: 📊
    title: Real-time Monitoring
    details: Check deployment status and stream logs in real-time with color-coded output and filtering options.
  - icon: 🌳
    title: Git Integration
    details: Auto-detect Git repositories, branches, and remotes. Support for GitHub, GitLab, and Bitbucket.
  - icon: 🔐
    title: Secure by Default
    details: API key authentication with secure storage. Automatic masking of sensitive environment variables.
  - icon: 💼
    title: Workspace Management
    details: Support for multiple workspaces and projects. Team collaboration with workspace-scoped API keys.
---

## Quick Start

Install TOSE CLI globally with npm:

```bash
npm install -g @tosesh/tose
```

Deploy your first application:

```bash
cd your-project
tose up
```

TOSE CLI will guide you through:
- API key authentication
- Workspace selection
- Project creation
- Git repository configuration
- Environment variables setup
- Deployment

## Why TOSE CLI?

### Developer-Friendly

TOSE CLI is designed with developer experience in mind. Interactive prompts, smart defaults, and helpful error messages make deployment straightforward.

```bash
# Check deployment status
tose status

# View logs with filtering
tose logs -n 100

# Stop deployment
tose down
```

### Smart Automation

Auto-detect your Git repository, branch, and environment files. TOSE CLI handles the heavy lifting so you can focus on building.

### Production-Ready

Built with TypeScript, comprehensive error handling, and tested workflows. Ready for both personal projects and enterprise deployments.

## Key Features

- **Interactive CLI** - Guided setup with validation and helpful prompts
- **Git-Powered Deployments** - Automatic deployment from your Git repositories
- **Environment Management** - Multi-file .env support with merging and masking
- **Real-time Logs** - Stream deployment logs with color-coded output
- **Workspace Support** - Manage multiple projects across different workspaces
- **Configuration Caching** - Save API keys and preferences locally

## What's Next?

<div class="vp-doc">

- [Getting Started](/guide/getting-started) - Install and deploy your first app
- [Commands Overview](/commands/overview) - Learn about available commands
- [Configuration](/guide/configuration) - Configure TOSE CLI for your needs
- [API Reference](/api/reference) - REST API documentation

</div>

## Community & Support

- [GitHub Issues](https://github.com/tosesh/tose/issues) - Report bugs or request features
- [Documentation](/) - Complete guides and API reference
- Email: tobi@wearetopgroup.com

---

<div style="text-align: center; margin-top: 2rem; color: #6b7280;">
  <p>Built with ❤️ by the TOSE team</p>
  <p style="font-size: 0.875rem;">Version 0.0.2 | Released under ISC License</p>
</div>
