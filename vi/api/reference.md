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

#### Dừng triển khai

```http
POST /api/workspaces/:slug/projects/:projectSlug/deployments/:id/stop
```

Yêu cầu vai trò owner hoặc admin. Trạng thái khác `pending`, `cloning`, `building`, `pushing`, `deploying` hoặc `running` trả về `400`. Phản hồi là triển khai với trạng thái `stopped`.

**Dừng một triển khai `running` sẽ dừng toàn bộ dự án.** Trong một lần ghi có khoá, TOSE đánh dấu `stopped` cho:

- mọi triển khai của dự án đang `running` hoặc `deploying`, và
- mọi triển khai của dự án còn ở trước bước deploy (`pending`, `cloning`, `building` hoặc `pushing`).

Ứng dụng được scale về 0 replica và giữ nguyên cho đến khi bạn deploy lại. Chỉ các triển khai được tạo trước khi Stop bắt đầu bị ảnh hưởng. Deploy được yêu cầu sau Stop vẫn build và phát hành bình thường. Bản build bị dừng không có deploy, không gửi email và không có sự kiện thành công hay thất bại. Redeploy sau đó không bao giờ chọn image của rollout đã bị huỷ.

**Dừng một triển khai `deploying` hoàn tất bất đồng bộ.** Pipeline build huỷ rollout rồi khôi phục phiên bản phục vụ gần nhất, nếu có. Nếu không có, workload được scale về 0. Nếu image của chính triển khai đó vẫn đang phục vụ, bản ghi kết thúc ở `running` kèm lý do trong `error_message`. Hãy đọc lại triển khai bằng `GET` sau khi Stop thay vì tin vào trạng thái trong phản hồi.

**Phản hồi:**

```json
{
  "id": "dep_xyz789",
  "status": "stopped"
}
```

**Lỗi:**

| Trạng thái | Ý nghĩa |
|--------|---------|
| `400` | Triển khai không ở trạng thái có thể dừng |
| `503` | Chưa có gì bị dừng: không lấy được khoá workload của dự án trong 60 giây vì một bước deploy đang kết thúc, hoặc không kết nối được cơ sở dữ liệu. Phản hồi có header `Retry-After` |

Stop phản hồi trong khoảng 100 giây. Khi gặp `503`, chờ số giây trong `Retry-After` rồi gửi lại yêu cầu. Việc thử lại là an toàn vì chưa có gì bị dừng.

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
