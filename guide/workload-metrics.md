# Workload metrics

TOSE samples each running project and template every five minutes and keeps the result as **resource metrics**: memory, pod readiness and network counters. This page explains what those figures measure, what they do not, and how to read them from the dashboard and the API.

## Configured is not observed

A workload has two different kinds of figures. Keep them apart when you read a chart.

| | What it is | Where it comes from |
|---|---|---|
| **Configured** | The CPU, memory and replicas the workload is set to use, and what billing recorded for it | The project or template settings and the usage ledger. This is configuration, never utilization |
| **Observed memory** | Memory used by the workload's own container (the first container of each pod; sidecars are not included), **summed over every running pod** | The metrics collector |
| **Observed readiness** | Pods listed, running and ready, counted over all running pods | The metrics collector |
| **CPU use** | Not collected. Shown as `unsupported` | None. Configured CPU is never shown as usage |
| **Network** | Cumulative per-pod byte counters. No rate is derived, so a network *rate* is `unsupported` | The metrics collector |

TOSE does not report CPU usage or an uptime percentage. An [uptime monitor](/api/projects#uptime) tells you whether its last check passed; it cannot prove a service was up between two checks.

## How a sample is taken

Every five minutes the collector reads every running pod of each active project and running template, up to 10 pods per workload. Each sample records:

- `running_pods`: how many pods were running;
- `sampled_pods`: how many of them answered;
- the sum of memory and network over the pods that answered.

A sample is **complete** when every running pod answered (`sampled_pods` equals `running_pods`). Only complete samples count towards memory and network. A sample where some pods did not answer, where every read failed, or where the workload ran more than 10 pods is kept, but it is not averaged into memory: it would understate the total.

Samples stored before this collector existed read only the first pod. They count only for a workload with at most one pod.

## Not measured is `null`, never `0`

When a figure was not measured, the API returns `null` and the dashboard leaves a gap in the chart. A `0` always means a real reading of zero. This applies to `memory_bytes`, `memory_mb`, `network_rx`, `network_tx` and `ready_count`, and to `pod_count` in buckets (a raw sample always has the number of pods listed).

A bucket that expected samples but has none is marked `gap: true`. A gap means "no observation", not "down".

## Resolutions

| Period | What you get | Granularity |
|---|---|---|
| `1h`, `6h`, `24h` | The stored samples, newest 1000 at most. `truncated: true` says older samples were left out | `raw` (one point every five minutes) |
| `7d` | Hourly buckets | `1h` |
| `30d` | Daily buckets | `1d` |

Buckets are computed over the whole window, so a 30-day chart covers the full 30 days. Hour buckets start on the local hour and day buckets at local midnight in the requested time zone; a day across a daylight-saving change is 23 or 25 hours long.

## In the dashboard

Open a template and choose **Metrics**. The period selector offers the five periods above. The memory and network charts use your browser's time zone for buckets and leave gaps where nothing was measured. **Config CPU** is the configured size, not usage.

## API {#api}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/metrics/resources?period=24h
GET /api/workspaces/{slug}/templates/{template_slug}/metrics/resources?period=30d&timezone=Asia/Ho_Chi_Minh
```

Any workspace member can read these. A workload of another workspace returns `404`.

| Query parameter | Description |
|---|---|
| `period` | `1h`, `6h`, `24h` (default), `7d` or `30d`. Any other value returns `400` |
| `timezone` | An IANA time zone name, such as `Europe/Berlin`. Sets the bucket boundaries of `7d` and `30d`. Defaults to UTC. For `7d` and `30d` an unknown name returns `400`; raw periods ignore it |

### Raw samples (`1h`, `6h`, `24h`)

```json
{
  "period": "24h",
  "since": "2026-11-10T00:00:00Z",
  "granularity": "raw",
  "observed_at": "2026-11-10T23:55:00Z",
  "source": "resource_metrics",
  "truncated": false,
  "count": 288,
  "data_points": [
    {
      "timestamp": "2026-11-10T23:55:00Z",
      "memory_bytes": 536870912,
      "memory_mb": 512,
      "network_rx": 120394,
      "network_tx": 88213,
      "pod_count": 2,
      "ready_count": 2,
      "running_pods": 2,
      "sampled_pods": 2
    }
  ]
}
```

`running_pods` and `sampled_pods` are present only on samples taken by the current collector. `pod_count` is the number of pods listed.

### Buckets (`7d`, `30d`)

```json
{
  "period": "30d",
  "since": "2026-10-11T23:57:12Z",
  "from": "2026-10-11T23:57:12Z",
  "to": "2026-11-10T23:57:12Z",
  "granularity": "1d",
  "timezone": "Asia/Ho_Chi_Minh",
  "observed_at": "2026-11-10T23:55:00Z",
  "source": "resource_metrics",
  "complete": false,
  "observed": {
    "memory": { "status": "incomplete", "reason": "some samples did not cover every replica or a stats read failed, ...", "coverage": 0.86, "source": "resource_metrics" },
    "readiness": { "status": "ok", "coverage": 0.97, "source": "resource_metrics" },
    "cpu": { "status": "unsupported", "reason": "the collector does not measure CPU usage; ...", "coverage": null, "source": "resource_metrics" },
    "network": { "status": "unsupported", "reason": "only cumulative per-pod counters are stored, ...", "coverage": null, "source": "resource_metrics" }
  },
  "truncated": false,
  "count": 31,
  "data_points": [
    {
      "timestamp": "2026-11-09T17:00:00Z",
      "memory_bytes": 529530880,
      "memory_mb": 505,
      "network_rx": 9120394,
      "network_tx": 4088213,
      "pod_count": 2,
      "ready_count": 2,
      "samples": 288,
      "gap": false
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `memory_bytes`, `memory_mb` | The average of the valid samples in the bucket (complete samples, and legacy one-pod samples of a one-pod workload); `null` when there were none |
| `network_rx`, `network_tx` | The largest cumulative counter among the valid samples in the bucket. Counters restart with each pod, so do not subtract two buckets to get a rate |
| `pod_count` | The most pods seen in the bucket |
| `ready_count` | The fewest ready pods seen in the bucket |
| `samples`, `gap` | How many samples the bucket holds, and whether samples were expected but none exists |
| `observed` | One signal each for `memory`, `readiness`, `cpu` and `network`, with `status` (`ok`, `incomplete`, `stale`, `unavailable` or `unsupported`), an optional `reason`, `source`, and `coverage` (valid samples over expected ones, 0 to 1, or `null`) |
| `complete` | `true` when every signal that can be measured is `ok`: coverage of at least 90% and a newest sample no older than three sampling intervals. Unsupported signals do not make an answer incomplete |
| `observed_at` | The time of the newest sample behind the answer, or `null` |

`timestamp` is the start of the bucket in UTC. `from` is the request time minus the period, and `to` is the request time. A 30-day window that does not start at local midnight has 31 buckets, so the oldest days are never cut off.

Workspace-wide figures come from the [analytics API](/api/analytics), which has its own definitions.

## Related

- [Projects API](/api/projects): status, uptime monitor and deployments
- [Project sidecars](/guide/project-sidecars): sidecars are not part of observed memory
- [`tose analytics`](/commands/analytics): workspace-wide costs, resources and reliability
