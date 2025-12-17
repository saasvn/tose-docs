# API Endpoints

Tham khảo đầy đủ các endpoint API của TOSE.

## Base URL

```
https://api.tose.sh/v1
```

## Workspaces

### Liệt kê Workspaces

```http
GET /api/v1/workspaces
```

**Headers:**
```http
X-API-KEY: ws_xxxxx
```

**Response:**
```json
{
  "data": [
    {
      "id": "ws_123",
      "name": "My Workspace",
      "slug": "my-workspace"
    }
  ]
}
```

## Projects

### Liệt kê Projects

```http
GET /api/v1/projects?workspaceId=ws_123
```

**Query Parameters:**
- `workspaceId` (string) - ID workspace
- `search` (string) - Tìm kiếm theo tên
- `limit` (number) - Số kết quả (mặc định: 20)
- `offset` (number) - Phân trang

**Response:**
```json
{
  "data": [
    {
      "id": "prj_abc",
      "name": "My App",
      "slug": "my-app",
      "port": 3000
    }
  ]
}
```

### Tạo Project

```http
POST /api/v1/projects
```

**Body:**
```json
{
  "name": "My App",
  "port": 3000,
  "workspaceId": "ws_123",
  "environmentVariables": {
    "NODE_ENV": "production"
  }
}
```

### Cập nhật Project

```http
PATCH /api/v1/projects/:projectId
```

**Body:**
```json
{
  "port": 8080,
  "environmentVariables": {
    "API_URL": "https://api.example.com"
  }
}
```

### Xóa Project

```http
DELETE /api/v1/projects/:projectId
```

## Deployments

### Liệt kê Deployments

```http
GET /api/v1/projects/:projectId/deployments
```

**Query Parameters:**
- `limit` (number) - Số kết quả
- `offset` (number) - Phân trang

**Response:**
```json
{
  "data": [
    {
      "id": "dep_xyz",
      "status": "running",
      "version": "v12",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Tạo Deployment

```http
POST /api/v1/projects/:projectId/deploy
```

**Body:**
```json
{
  "branch": "main",
  "environmentVariables": {
    "NODE_ENV": "production"
  }
}
```

### Lấy trạng thái Deployment

```http
GET /api/v1/deployments/:deploymentId/status
```

**Response:**
```json
{
  "data": {
    "id": "dep_xyz",
    "status": "running",
    "phase": "Running",
    "replicas": {
      "desired": 2,
      "ready": 2
    }
  }
}
```

### Lấy Logs

```http
GET /api/v1/deployments/:deploymentId/logs
```

**Query Parameters:**
- `limit` (number) - Số dòng log (mặc định: 100)
- `since` (string) - Timestamp bắt đầu

**Response:**
```json
{
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-15T10:00:00Z",
        "level": "info",
        "message": "Starting deployment"
      }
    ]
  }
}
```

## Git Repositories

### Liệt kê Repositories

```http
GET /api/v1/git/repositories?workspaceId=ws_123
```

**Response:**
```json
{
  "data": [
    {
      "id": "repo_xyz",
      "name": "my-app",
      "url": "https://github.com/user/my-app",
      "provider": "github"
    }
  ]
}
```

## Status Codes

| Code | Mô tả |
|------|-------|
| 200 | Thành công |
| 201 | Đã tạo |
| 204 | Không có nội dung |
| 400 | Yêu cầu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 429 | Quá nhiều yêu cầu |
| 500 | Lỗi server |

## Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "statusCode": 400
  }
}
```

## Rate Limiting

- **Giới hạn:** 100 requests/phút
- **Headers:**
  - `X-RateLimit-Limit`: Giới hạn
  - `X-RateLimit-Remaining`: Còn lại
  - `X-RateLimit-Reset`: Thời gian reset

## Pagination

```http
GET /api/v1/projects?limit=20&offset=0
```

Response bao gồm:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

## Tài liệu liên quan

- [REST API](/vi/api/reference)
- [Xác thực](/vi/api/authentication)
- [TOSE CLI](/vi/guide/introduction)
