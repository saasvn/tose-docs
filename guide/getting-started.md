# Getting Started

Welcome to the TOSE documentation! This guide will help you get up and running quickly.

## Installation

Install TOSE using your preferred package manager:

::: code-group

```bash [npm]
npm install tose
```

```bash [yarn]
yarn add tose
```

```bash [pnpm]
pnpm add tose
```

:::

## Basic Usage

Here's a simple example to get you started:

```typescript
import { initialize, configure } from 'tose'

// Initialize the application
const app = initialize({
  apiKey: 'your-api-key',
  environment: 'production'
})

// Configure options
configure({
  timeout: 5000,
  retries: 3
})
```

## Next Steps

- Learn about [Configuration](/guide/configuration)
- Explore [Advanced Usage](/guide/advanced)
- Check out the [API Reference](/api/reference)

## Prerequisites

Before you begin, ensure you have:

- Node.js 16.x or higher
- npm/yarn/pnpm installed
- Basic knowledge of TypeScript/JavaScript

## Troubleshooting

If you encounter any issues during installation:

1. Make sure you're using a compatible Node.js version
2. Clear your npm cache: `npm cache clean --force`
3. Try removing `node_modules` and reinstalling

For more help, check our [GitHub Issues](https://github.com/yourusername/tose/issues).
