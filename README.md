# TOSE Documentation

This directory contains the documentation site built with VitePress.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run docs:dev
```

The site will be available at `http://localhost:5173`

## Build

Build the documentation for production:

```bash
npm run docs:build
```

Preview the production build:

```bash
npm run docs:preview
```

## Production Deployment with PM2

### 1. Install dependencies

```bash
npm install
```

### 2. Build the documentation

```bash
npm run docs:build
```

### 3. Start with PM2

```bash
# Start docs server
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot (optional)
pm2 startup
```

### 4. PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs docs

# Restart
pm2 restart docs

# Stop
pm2 stop docs

# Delete
pm2 delete docs
```

The docs will be available at `http://localhost:4173`

## Structure

```
docs/
├── .vitepress/
│   └── config.js          # VitePress configuration
├── guide/
│   ├── getting-started.md # Getting started guide
│   ├── configuration.md   # Configuration options
│   └── advanced.md        # Advanced usage
├── api/
│   ├── reference.md       # API reference
│   ├── authentication.md  # Authentication docs
│   └── endpoints.md       # API endpoints
└── index.md              # Home page
```

## Customization

Edit `.vitepress/config.js` to customize:

- Site title and description
- Navigation menu
- Sidebar structure
- Theme settings
- Social links

## Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add it to the sidebar in `.vitepress/config.js`
3. Start writing using Markdown and Vue components

## Learn More

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
