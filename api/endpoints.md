# API Endpoints

::: warning Example only
The endpoints on this page are illustrative. The authoritative list is the OpenAPI spec at `https://api.tose.sh/api/openapi.yaml`. See the [REST API reference](/api/reference).
:::

Reference for all available API endpoints.

## Base URL

```
https://api.tose.example.com/v1
```

## Users

### Get User

Retrieve user information.

```http
GET /users/{id}
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | User ID |

**Response:**

```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Create User

Create a new user.

```http
POST /users
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Response:**

```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Update User

Update user information.

```http
PATCH /users/{id}
```

**Body:**

```json
{
  "name": "Jane Doe"
}
```

### Delete User

Delete a user.

```http
DELETE /users/{id}
```

**Response:** `204 No Content`

## Projects

### List Projects

Get all projects.

```http
GET /projects
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20) |
| `sort` | `string` | Sort field (default: createdAt) |

**Response:**

```json
{
  "data": [
    {
      "id": "proj_123",
      "name": "My Project",
      "description": "Project description",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Create Project

Create a new project.

```http
POST /projects
```

**Body:**

```json
{
  "name": "My Project",
  "description": "Project description"
}
```

## Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

## Rate Limiting

Rate limits are applied per API key:

- Free tier: 100 requests/minute
- Pro tier: 1000 requests/minute
- Enterprise: Custom limits

Headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```
