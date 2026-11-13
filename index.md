---
layout: home
title: "TOSE Docs: deploy apps, connect AI agents, integrate the API"
titleTemplate: false
description: "Documentation for the TOSE cloud platform: deploy apps with the CLI, connect AI agents over MCP, and integrate with the REST API."

hero:
  name: TOSE Docs
  text: Deploy, operate and automate on TOSE
  tagline: The prepaid cloud platform for apps and AI agents. Use the CLI, connect an MCP agent, or call the REST API.
  actions:
    - theme: brand
      text: Deploy an app
      link: /guide/deploy-an-app
    - theme: alt
      text: CLI
      link: /commands/overview
    - theme: alt
      text: Connect an AI agent (MCP)
      link: /guide/connect-an-agent
    - theme: alt
      text: Integrate via REST API
      link: /guide/integrate-the-api

features:
  - title: Deploy an app
    details: Install the CLI, log in and deploy a Git repository with tose up, then verify it is running.
    link: /guide/deploy-an-app
    linkText: Start the guide
  - title: CLI
    details: Every @tosesh/tose command, with --json output for scripts and CI.
    link: /commands/overview
    linkText: Command reference
  - title: Connect an AI agent (MCP)
    details: Give Claude or another MCP client scoped access to one workspace. Deploys and rollbacks wait for your approval.
    link: /guide/connect-an-agent
    linkText: Connect a client
  - title: Integrate via REST API
    details: One versioned OpenAPI 3.1 contract, API keys with scopes, and stable error codes.
    link: /guide/integrate-the-api
    linkText: Call the API
---

## Quick start

```bash
npm install -g @tosesh/tose
tose login
cd my-app
tose up
```

Then follow [Deploy an app](/guide/deploy-an-app) to verify the deployment.

## More to explore

- [Cloud Harness](/guide/cloud-harness) and [coding agents](/guide/deploy-coding-agent)
- [Configuration](/guide/configuration), [environment variables](/guide/environment) and [custom domains](/guide/custom-domains)
- [Pricing](/guide/pricing) and [troubleshooting](/guide/troubleshooting)
