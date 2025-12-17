# Tài liệu REST API

Tài liệu REST API đầy đủ cho nền tảng TOSE.

## Base URL

```
https://api.tose.sh
```

Tất cả yêu cầu API phải bao gồm xác thực qua header `X-API-KEY`.

## Xác thực

```http
X-API-KEY: ws_your_api_key_here
```

Xem [Xác thực](/vi/api/authentication) để biết chi tiết.

## API Client

TOSE CLI sử dụng class `ApiClient` để tương tác với API.

### Khởi tạo

```typescript
import { ApiClient } from '@tosesh/tose/services/api'

const client = new ApiClient({
  apiKey: 'ws_xxxxx',
  baseUrl: 'https://api.tose.sh'
})
```

## Endpoints

### Workspaces

#### Liệt kê Workspaces

```http
GET /api/v1/workspaces
```

**Phản hồi:**

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

### Dự án

#### Liệt kê dự án

```http
GET /api/v1/projects?workspaceId=ws_123&search=my-app
```

**Tham số Query:**

| Tham số | Kiểu | Mô tả |
|-----------|------|-------------|
| `workspaceId` | string | Lọc theo workspace |
| `search` | string | Tìm kiếm theo tên |
| `limit` | number | Kết quả mỗi trang |
| `offset` | number | Offset phân trang |

#### Tạo dự án

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
  }
}
```

### Triển khai

#### Liệt kê triển khai

```http
GET /api/v1/projects/:projectId/deployments
```

#### Lấy trạng thái triển khai

```http
GET /api/v1/deployments/:deploymentId/status
```

**Phản hồi:**

```json
{
  "data": {
    "id": "dep_xyz789",
    "status": "running",
    "phase": "Running",
    "version": "v12",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### Triển khai dự án

```http
POST /api/v1/projects/:projectId/deploy
```

#### Lấy logs triển khai

```http
GET /api/v1/deployments/:deploymentId/logs?limit=100
```

**Tham số Query:**

| Tham số | Kiểu | Mô tả |
|-----------|------|-------------|
| `limit` | number | Số dòng log (mặc định: 100) |
| `since` | string | Timestamp bắt đầu từ |
| `follow` | boolean | Theo dõi logs (chưa triển khai) |

## Xử lý lỗi

### Định dạng phản hồi lỗi

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key không hợp lệ hoặc hết hạn",
    "statusCode": 401
  }
}
```

### Mã lỗi phổ biến

| Mã | Trạng thái | Mô tả |
|------|--------|-------------|
| `INVALID_API_KEY` | 401 | API key không hợp lệ |
| `UNAUTHORIZED` | 403 | Quyền không đủ |
| `NOT_FOUND` | 404 | Tài nguyên không tìm thấy |
| `VALIDATION_ERROR` | 400 | Dữ liệu yêu cầu không hợp lệ |
| `RATE_LIMIT_EXCEEDED` | 429 | Quá nhiều yêu cầu |
| `INTERNAL_ERROR` | 500 | Lỗi server |

## Giới hạn tốc độ

- **Giới hạn tốc độ:** 100 yêu cầu mỗi phút mỗi API key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Phân trang

Các endpoint liệt kê hỗ trợ phân trang:

```typescript
const projects = await client.listProjects('ws_123', {
  limit: 20,
  offset: 0
})

// Trang tiếp theo
const nextPage = await client.listProjects('ws_123', {
  limit: 20,
  offset: 20
})
```

## Kiểu TypeScript

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

## Tài liệu liên quan

- [Xác thực](/vi/api/authentication) - Xác thực API key
- [Endpoints](/vi/api/endpoints) - Tài liệu endpoint chi tiết
- [TOSE CLI](/vi/guide/introduction) - Công cụ CLI sử dụng API này
