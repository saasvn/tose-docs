# tose open

Open your project URL in the default browser.

## Synopsis

```bash
tose open [project]
```

## Description

Opens the project's URL in your default web browser. The command first checks for custom domains, then falls back to the service URL from the latest deployment.

## Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

## Usage

```bash
$ tose open

✓ Fetching project URL...
Opening https://my-app.tose.sh
```

**Open specific project:**

```bash
$ tose open my-workspace/my-app

✓ Fetching project URL...
Opening https://my-app.tose.sh
```

## URL Resolution

The URL is determined in this order:

1. Default custom domain (if configured)
2. First custom domain
3. Service URL from latest deployment

## JSON Output

```bash
$ tose open --json
```

```json
{
  "success": true,
  "data": {
    "url": "https://my-app.tose.sh"
  }
}
```

## Platform Support

The browser is opened using the platform's native command:

| OS | Command |
|----|---------|
| macOS | `open` |
| Linux | `xdg-open` |
| Windows | `start` |

## Related Commands

- [`tose status`](/commands/status) - Check project status and URL
- [`tose domain list`](/commands/domain) - View all configured domains
