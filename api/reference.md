# REST API Reference

Complete REST API reference for TOSE platform.

## Base URL

```
https://api.tose.sh
```

All API requests must include authentication via the `X-API-KEY` header.

## Authentication

```http
X-API-KEY: ws_your_api_key_here
```

See [Authentication](/api/authentication) for details.

## API Client

TOSE CLI uses an `ApiClient` class to interact with the API.

### Initialization

```typescript
import { ApiClient } from '@tosesh/tose/services/api'

const client = new ApiClient({
  apiKey: 'ws_xxxxx',
  baseUrl: 'https://api.tose.sh'
})
```

## Endpoints

### Workspaces

#### List Workspaces

```http
GET /api/v1/workspaces
```

**Response:**

```json
{
  "data": [
    {
      "id": "ws_123456",
      "name": "My Workspace",
      "slug": "my-workspace",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Example:**

```typescript
const workspaces = await client.listWorkspaces()
```

### Projects

#### List Projects

```http
GET /api/v1/projects?workspaceId=ws_123&search=my-app
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | Filter by workspace |
| `search` | string | Search by name |
| `limit` | number | Results per page |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "data": [
    {
      "id": "prj_abc123",
      "name": "My App",
      "slug": "my-app",
      "port": 3000,
      "workspaceId": "ws_123",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

**Example:**

```typescript
const projects = await client.listProjects('ws_123', {
  search: 'my-app',
  limit: 10
})
```

#### Create Project

```http
POST /api/v1/projects
```

**Request Body:**

```json
{
  "name": "My App",
  "port": 3000,
  "workspaceId": "ws_123",
  "environmentVariables": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "gitRepositoryId": "repo_xyz"
}
```

**Response:**

```json
{
  "data": {
    "id": "prj_abc123",
    "name": "My App",
    "slug": "my-app",
    "port": 3000,
    "url": "https://my-app.tose.app"
  }
}
```

**Example:**

```typescript
const project = await client.createProject({
  name: 'My App',
  port: 3000,
  workspaceId: 'ws_123',
  environmentVariables: {
    NODE_ENV: 'production'
  }
})
```

#### Update Project

```http
PATCH /api/v1/projects/:projectId
```

**Request Body:**

```json
{
  "port": 8080,
  "environmentVariables": {
    "NODE_ENV": "production",
    "API_URL": "https://api.example.com"
  }
}
```

### Deployments

#### List Deployments

```http
GET /api/v1/projects/:projectId/deployments
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Results per page (default: 10) |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "data": [
    {
      "id": "dep_xyz789",
      "projectId": "prj_abc123",
      "status": "running",
      "version": "v12",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### Get Deployment Status

```http
GET /api/v1/deployments/:deploymentId/status
```

**Response:**

```json
{
  "data": {
    "id": "dep_xyz789",
    "status": "running",
    "phase": "Running",
    "version": "v12",
    "replicas": {
      "desired": 2,
      "ready": 2
    },
    "health": {
      "healthy": true,
      "checks": {
        "liveness": "passing",
        "readiness": "passing"
      }
    },
    "createdAt": "2025-01-15T10:00:00Z",
    "startedAt": "2025-01-15T10:01:00Z"
  }
}
```

**Example:**

```typescript
const status = await client.getDeploymentStatus('dep_xyz789')
console.log(status.phase) // "Running"
```

#### Deploy Project

```http
POST /api/v1/projects/:projectId/deploy
```

**Request Body:**

```json
{
  "branch": "main",
  "environmentVariables": {
    "NODE_ENV": "production"
  }
}
```

**Response:**

```json
{
  "data": {
    "deploymentId": "dep_new123",
    "status": "pending",
    "message": "Deployment initiated"
  }
}
```

#### Stop Deployment

```http
POST /api/workspaces/:slug/projects/:projectSlug/deployments/:id/stop
```

Requires the owner or admin role. Any status other than `pending`, `cloning`, `building`, `pushing`, `deploying` or `running` returns `400`. The response is the deployment with status `stopped`.

**Stopping a `running` deployment stops the whole project.** In one locked write, TOSE records `stopped` on:

- every deployment of the project that is `running` or `deploying`, and
- every deployment of the project that is still before deploy (`pending`, `cloning`, `building` or `pushing`).

The app is scaled to zero replicas and stays there until you deploy again. Only deployments created before the Stop began are affected. A deploy requested after the Stop builds and ships normally. A stopped build gets no deploy, no email, and no success or failure event. A later redeploy never picks the image of a cancelled rollout.

**Stopping a `deploying` deployment finishes asynchronously.** The build pipeline cancels the rollout, then puts back the version that served last, if one exists. Otherwise it scales the workload to zero. If the deployment's own image is still the one serving, the row ends `running` again with the reason in `error_message`. Re-read the deployment with `GET` after a Stop, rather than trusting the status in the response.

**Response:**

```json
{
  "id": "dep_xyz789",
  "status": "stopped"
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| `400` | The deployment is not in a stoppable status |
| `503` | Nothing was stopped: the project's workload lock could not be taken within 60 seconds because a deployment step is finishing, or the database is unreachable. The response carries a `Retry-After` header |

A Stop answers within about 100 seconds. On `503`, wait the number of seconds in `Retry-After`, then send the request again. The retry is safe because nothing was stopped.

```typescript
const res = await fetch(url, { method: 'POST', headers })
if (res.status === 503) {
  const wait = Number(res.headers.get('Retry-After') ?? 5)
  await new Promise(r => setTimeout(r, wait * 1000))
  // retry the Stop request
}
```

#### Get Deployment Logs

```http
GET /api/v1/deployments/:deploymentId/logs?limit=100
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of log lines (default: 100) |
| `since` | string | Timestamp to start from |
| `follow` | boolean | Stream logs (not yet implemented) |

**Response:**

```json
{
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-15T10:00:15Z",
        "level": "info",
        "message": "Starting deployment..."
      },
      {
        "timestamp": "2025-01-15T10:00:20Z",
        "level": "info",
        "message": "Cloning repository..."
      }
    ]
  }
}
```

**Example:**

```typescript
const logs = await client.getDeploymentLogs('dep_xyz789', {
  limit: 50
})

logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`)
})
```

### Git Repositories

#### List Git Repositories

```http
GET /api/v1/git/repositories?workspaceId=ws_123
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | string | Filter by workspace |
| `all` | boolean | Include all accessible repos |

**Response:**

```json
{
  "data": [
    {
      "id": "repo_xyz",
      "name": "my-app",
      "fullName": "username/my-app",
      "url": "https://github.com/username/my-app",
      "provider": "github",
      "defaultBranch": "main"
    }
  ]
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid or expired",
    "statusCode": 401
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid |
| `UNAUTHORIZED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Handling Example

```typescript
try {
  const project = await client.createProject(data)
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Invalid API key')
  } else if (error.statusCode === 400) {
    console.error('Validation error:', error.message)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Rate Limiting

- **Rate Limit:** 100 requests per minute per API key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Pagination

List endpoints support pagination:

```typescript
const projects = await client.listProjects('ws_123', {
  limit: 20,
  offset: 0
})

// Next page
const nextPage = await client.listProjects('ws_123', {
  limit: 20,
  offset: 20
})
```

## TypeScript Types

### Project

```typescript
interface Project {
  id: string
  name: string
  slug: string
  port: number
  workspaceId: string
  environmentVariables?: Record<string, string>
  gitRepositoryId?: string
  createdAt: string
  updatedAt: string
}
```

### Deployment

```typescript
interface Deployment {
  id: string
  projectId: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped'
  phase: string
  version: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}
```

### Log Entry

```typescript
interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}
```

## Related Documentation

- [Authentication](/api/authentication) - API key authentication
- [Endpoints](/api/endpoints) - Detailed endpoint documentation
- [TOSE CLI](/guide/introduction) - CLI tool using this API
