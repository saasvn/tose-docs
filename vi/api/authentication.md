# Xác thực API

Tìm hiểu cách xác thực với TOSE API.

## Tổng quan

TOSE API sử dụng xác thực dựa trên API key. Mỗi yêu cầu phải bao gồm API key trong header.

## API Key Authentication

### Header yêu cầu

```http
X-API-KEY: ws_your_api_key_here
```

### Ví dụ

```bash
curl -X GET \
  https://api.tose.sh/api/v1/workspaces \
  -H "X-API-KEY: ws_xxxxxxxxxxxxx"
```

## Lấy API Key

1. Đăng nhập vào [TOSE Dashboard](https://tose.sh)
2. Điều hướng đến **Settings** > **API Keys**
3. Nhấp **Create New API Key**
4. Sao chép key (bắt đầu bằng `ws_`)
5. Lưu trữ an toàn

## Loại API Key

### User-Scoped Keys

- Truy cập nhiều workspace
- Người dùng phải chọn workspace
- Tốt cho sử dụng cá nhân

### Workspace-Scoped Keys

- Gắn với workspace cụ thể
- Không cần chọn workspace
- Tốt cho cộng tác nhóm

## Sử dụng trong TOSE CLI

TOSE CLI tự động quản lý API key:

```bash
tose up
# Nhập API key khi được nhắc
# Key được lưu trong ~/.tose/config.json
```

## Scope và tự động triển khai

API key của workspace có thể mang scope. Key không có scope, và mọi phiên đăng nhập, giữ toàn quyền trong workspace. Kết nối Git với dự án, và tạo dự án có khối `git`, là thao tác `projects:write` nhưng có thể xếp hàng một lần triển khai đầu tiên. API chỉ bắt đầu lần triển khai đó khi người gọi cũng có `deployments:execute`. Mỗi lần triển khai đầu tiên tự động ghi một sự kiện kiểm toán `deployment.execute` kèm ID triển khai.

Với key có `projects:write` nhưng không có `deployments:execute`:

| Thao tác | Kết quả |
|---|---|
| Kết nối Git với dự án | Thành công. Không có lần triển khai đầu nào được xếp hàng và kết nối được tạo với `auto_deploy` tắt. |
| Tạo dự án có khối `git` | Thành công và trả `deploy_skipped` thay cho `deployment_id` và `build_logs_url`. |
| Bật `auto_deploy`, hoặc đổi nhánh của kết nối đang tự động triển khai | Thất bại với `403 insufficient_scope` và `required_scope: deployments:execute`. |

Hãy thêm `deployments:execute` vào key, hoặc dùng phiên đăng nhập, khi muốn mỗi lần push Git tự động triển khai.

## Bảo mật

### Best Practices

1. **Không commit key vào Git**
   ```bash
   # .gitignore
   .env
   .tose/
   ```

2. **Sử dụng biến môi trường**
   ```bash
   export TOSE_API_KEY="ws_xxxxx"
   ```

3. **Rotate key thường xuyên**
   - Tạo key mới mỗi 90 ngày
   - Thu hồi key cũ sau khi migrate

4. **Key khác nhau cho môi trường**
   - Development: Personal key
   - CI/CD: Dedicated automation key
   - Production: Workspace-scoped key

### Lưu trữ an toàn

```json
// ~/.tose/config.json
{
  "apiKey": "ws_xxxxxxxxxxxxx"
}
```

Quyền file:
```bash
chmod 600 ~/.tose/config.json
```

## Lỗi xác thực

### 401 Unauthorized

**Nguyên nhân:**
- API key không hợp lệ
- Key đã hết hạn
- Key đã bị thu hồi

**Giải pháp:**
1. Xác minh key bắt đầu bằng `ws_`
2. Tạo key mới trong dashboard
3. Cập nhật trong config:
   ```bash
   rm ~/.tose/config.json
   tose up
   ```

### 403 Forbidden

**Nguyên nhân:**
- Quyền không đủ
- Key không có quyền truy cập resource

**Giải pháp:**
- Kiểm tra quyền key trong dashboard
- Sử dụng key có quyền phù hợp

## Tích hợp CI/CD

### GitHub Actions

```yaml
- name: Deploy
  env:
    TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
  run: |
    mkdir -p ~/.tose
    echo '{"apiKey":"'$TOSE_API_KEY'"}' > ~/.tose/config.json
    tose up
```

### GitLab CI

```yaml
deploy:
  script:
    - mkdir -p ~/.tose
    - echo "{\"apiKey\":\"$TOSE_API_KEY\"}" > ~/.tose/config.json
    - tose up
```

## Rate Limiting

- **Giới hạn:** 100 yêu cầu/phút/key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Tài liệu liên quan

- [REST API](/vi/api/reference)
- [Endpoints](/vi/api/endpoints)
- [Cấu hình](/vi/guide/configuration)
