# tose logs

View build logs or stream live application logs.

## Synopsis

```bash
tose logs [project] [options]
```

## Description

The `tose logs` command displays two types of logs:

- **Build logs** (`--build`): Docker build output from the deployment process
- **Live logs** (default): Real-time application output from running pods

Logs are color-coded by severity for easy reading.

## Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--build` | | Show build logs instead of live logs |
| `--follow` | `-f` | Stream logs in real-time via WebSocket |
| `--lines <number>` | `-n` | Number of lines to display (default: 100) |
| `--deployment <id>` | `-d` | View logs for a specific deployment |

## Usage

### Stream Build Logs

Watch the Docker build process in real-time:

```bash
$ tose logs --build -f

Finding latest deployment...

Step 1/12 : FROM node:18-alpine AS builder
 ---> a1b2c3d4e5f6
Step 2/12 : WORKDIR /app
 ---> Using cache
Step 3/12 : COPY package*.json ./
 ---> Using cache
Step 4/12 : RUN npm ci
 ---> Running in abc123def456
npm warn deprecated some-package@1.0.0
added 834 packages in 12s
Step 5/12 : COPY . .
Step 6/12 : RUN npm run build
 ---> Running in xyz789abc012
> my-app@1.0.0 build
> tsc && vite build
...
Successfully built a1b2c3d4e5f6
Successfully tagged my-app:latest
```

### Stream Live Application Logs

```bash
$ tose logs -f

[2025-06-15 10:30:15] Server started on port 3000
[2025-06-15 10:30:16] Connected to database
[2025-06-15 10:31:02] GET /api/users 200 12ms
[2025-06-15 10:31:05] GET /api/health 200 2ms
[2025-06-15 10:31:10] POST /api/login 201 45ms
```

### View Build Logs for Specific Deployment

```bash
$ tose logs --build -d dep_abc123
```

### View Logs Without Streaming

```bash
$ tose logs --build

Finding latest deployment...
(shows completed build logs if deployment is finished)
```

::: tip
For live logs, the `--follow` flag is required since live logs are streamed via WebSocket.
:::

## Log Color Coding

Build logs are color-coded for readability:

| Pattern | Color | Meaning |
|---------|-------|---------|
| `ERROR` | Red | Build or runtime errors |
| `WARN` | Yellow | Warnings |
| `Step N/M` | Cyan | Docker build steps |
| Other | Default | Normal output |

## WebSocket Streaming

When using `-f` / `--follow`, logs are streamed via WebSocket:

- The API key is sent in the `X-API-Key` header, never in the URL. The CLI refuses to open a stream whose URL carries a credential
- Press `Ctrl+C` to stop streaming
- Connection auto-closes when build finishes (`[END]` message)
- Errors are displayed in red (`[ERROR]` messages)
- Reconnects are not automatic - rerun the command if disconnected

## Use Cases

### Debug a Failed Build

```bash
# Check what went wrong
tose logs --build -d dep_abc123
```

Look for red `ERROR` lines in the output.

### Monitor Deployment Progress

```bash
# Terminal 1: trigger deploy
tose deploy

# Terminal 2: watch build
tose logs --build -f
```

### Debug Runtime Issues

```bash
# Stream live logs
tose logs -f

# Or check status first
tose status
tose logs -f
```

### Save Logs to File

```bash
tose logs --build -d dep_abc123 > build-log.txt
```

## Related Commands

- [`tose status`](/commands/status) - Check deployment status
- [`tose deploy`](/commands/deploy) - Trigger deployment
- [`tose open`](/commands/open) - Open project URL
