# tose logs

View deployment logs with filtering and real-time streaming.

## Synopsis

```bash
tose logs [options]
```

## Description

The `tose logs` command displays logs from your deployments with:

- Color-coded output by log level
- Timestamp information
- Configurable line limits
- Real-time streaming support
- Filter by deployment ID

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--project <id>` | `-p` | View logs for specific project |
| `--deployment <id>` | `-d` | View logs for specific deployment |
| `--lines <number>` | `-n` | Number of lines to display (default: 100) |
| `--follow` | `-f` | Stream logs in real-time |

## Usage

### Interactive Mode

View logs with guided selection:

```bash
tose logs
```

### View Last 50 Lines

```bash
tose logs -n 50
```

### View Specific Project

```bash
tose logs --project my-app
```

### View Specific Deployment

```bash
tose logs --deployment dep_abc123
```

### Stream Logs in Real-Time

```bash
tose logs --follow
```

### Combined Options

```bash
tose logs --project my-app -n 200 --follow
```

## Log Levels

Logs are color-coded by severity:

| Level | Color | Icon | Description |
|-------|-------|------|-------------|
| INFO | Blue | ℹ️ | Informational messages |
| WARN | Yellow | ⚠️ | Warning messages |
| ERROR | Red | ❌ | Error messages |
| DEBUG | Gray | 🔍 | Debug information |

## Example Output

```bash
$ tose logs -n 20

Deployment Logs (dep_abc123)

[2025-01-15 10:30:15] INFO ℹ️ Starting deployment...
[2025-01-15 10:30:16] INFO ℹ️ Cloning repository from GitHub
[2025-01-15 10:30:20] INFO ℹ️ Installing dependencies...
[2025-01-15 10:30:45] INFO ℹ️ Running npm install
[2025-01-15 10:31:00] INFO ℹ️ Build successful
[2025-01-15 10:31:02] INFO ℹ️ Starting application on port 3000
[2025-01-15 10:31:05] INFO ✅ Application running
[2025-01-15 10:31:10] INFO ℹ️ Health check passed
```

## Use Cases

### Debug Deployment Issues

```bash
tose logs --project my-app -n 200
```

### Monitor Deployment Progress

```bash
tose up
# In another terminal
tose logs --follow
```

### Save Logs for Analysis

```bash
tose logs -n 1000 > deployment-logs.txt
```

### Check Specific Deployment

```bash
tose logs --deployment dep_abc123
```

### CI/CD Log Capture

```bash
# In CI pipeline
tose logs --project $PROJECT_NAME -n 500 | tee build-logs.txt
```

## Log Patterns

### Application Startup

```
[timestamp] INFO Cloning repository...
[timestamp] INFO Installing dependencies...
[timestamp] INFO Building application...
[timestamp] INFO Starting application...
[timestamp] INFO Application running on port 3000
```

### Deployment Errors

```
[timestamp] ERROR Build failed: syntax error
[timestamp] ERROR npm install failed with code 1
[timestamp] ERROR Container failed health check
```

### Runtime Logs

```
[timestamp] INFO Request: GET /api/users
[timestamp] INFO Response: 200 OK
[timestamp] WARN High memory usage: 85%
[timestamp] ERROR Database connection lost
```

## Best Practices

### 1. Start with Recent Logs

```bash
tose logs -n 50  # Last 50 lines
```

### 2. Increase Lines for Debugging

```bash
tose logs -n 500  # More context
```

### 3. Use Follow Mode During Deployment

```bash
tose logs --follow
```

### 4. Filter by Deployment

```bash
# Get deployment ID from status
tose status
# View specific deployment
tose logs --deployment dep_xyz789
```

### 5. Save Important Logs

```bash
tose logs -n 1000 > logs-$(date +%Y%m%d).txt
```

## Troubleshooting

### No Logs Available

If no logs appear:

1. Check deployment exists:
   ```bash
   tose status
   ```

2. Verify deployment ID:
   ```bash
   tose status --project my-app
   ```

3. Try different project:
   ```bash
   tose logs  # Use interactive selection
   ```

### Logs Stop Streaming

If `--follow` stops:

- Press Ctrl+C to exit
- Restart with `tose logs --follow`
- Check deployment is still running

### Connection Issues

If logs fail to load:

- Verify API key is valid
- Check internet connection
- Try again without `--follow`

## Related Commands

- [`tose status`](/commands/status) - Check deployment status
- [`tose up`](/commands/up) - Deploy application
- [`tose down`](/commands/down) - Stop deployment
