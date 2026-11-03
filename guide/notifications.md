# Notifications inbox

The notifications inbox lists the operations events of a workspace for each signed-in member: uptime failures, deployment outcomes, billing and backup events. It is a read-only view of the same events that feed [incidents](/api/projects#uptime) and external alerts. Each member keeps their own read state and preferences.

Open **Notifications** in the workspace sidebar of the dashboard.

## What the inbox shows

- Events are listed newest first. Repeated events of one incident are shown as one row, with the latest event.
- Each row carries the event (`source`, `kind`, `severity`, `subject`, `summary`, redacted `evidence`) and the member's own `read_at` and `acknowledged_at`.
- `deliveries` shows the current state of external alerts for the displayed event: `channel` (`email`, `discord`, `webhook` or `other`), `status` (`pending`, `sending`, `sent` or `failed`), `attempts` and `updated_at`. The recipient, internal sink id and provider error text are never included.
- Read and acknowledge state is per member. You never see another member's state, and the event itself is not changed.

## Mark events read or acknowledged

Marking an event read or acknowledged is idempotent: repeating the call keeps the original time.

## Preferences

Each member can set, per workspace:

| Setting | Meaning |
|---------|---------|
| `inbox_enabled` | Turn the in-app inbox on or off. Default `true` |
| `min_severity` | Show only events at or above `info`, `warning` or `critical`. Default `info` |
| `muted_kinds` | Event kinds to hide, for example `uptime.down`. Up to 50 unique kinds |

These settings change only your inbox. They do not change email, Discord or webhook alerts, so muting a kind cannot silence a critical alert.

## API

All routes are under `/api/workspaces/{slug}` and need a signed-in session with workspace membership. **API keys and connected apps are refused with `403`.**

| Method and path | Description |
|-----------------|-------------|
| `GET /notifications?limit=&cursor=` | List the inbox. `limit` is 1-100. The response is `{ "notifications": [...], "next_cursor": "..." }`; `next_cursor` is `null` on the last page |
| `POST /notifications/{event_id}/read` | Mark one event read. `204` |
| `POST /notifications/{event_id}/ack` | Acknowledge one event. `204` |
| `GET /notifications/preferences` | Read your preferences |
| `PUT /notifications/preferences` | Replace your preferences. Send all three fields: `inbox_enabled`, `min_severity`, `muted_kinds` |

```bash
curl "https://api.tose.sh/api/workspaces/$WS/notifications?limit=20" \
  -H "Cookie: tose_token=$TOSE_SESSION"
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid preference (unknown severity, more than 50 kinds, duplicate or malformed kind, missing field) or invalid `cursor` |
| `401` | Not signed in |
| `403` | The caller is an API key or connected app |
| `404` | Not a member of the workspace, or the event does not exist in it |

## Related

- [Uptime monitor](/api/projects#uptime)
- [Post-deploy health gate](/api/projects#health-gate)
- [Errors](/api/errors)
