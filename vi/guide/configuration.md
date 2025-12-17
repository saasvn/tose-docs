# Cấu hình

Tìm hiểu cách cấu hình TOSE CLI theo nhu cầu của bạn.

## File cấu hình

TOSE CLI lưu trữ cấu hình trong file JSON tại:

```
~/.tose/config.json
```

### Cấu trúc

```json
{
  "apiKey": "ws_xxxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

### Các trường

| Trường | Kiểu | Mô tả | Bắt buộc |
|-------|------|-------|----------|
| `apiKey` | string | TOSE API key | Có |
| `workspaceId` | string | ID workspace mặc định | Không |
| `baseUrl` | string | URL API cơ sở | Không |

## API Key

### Lấy API Key

1. Đăng nhập vào [TOSE Dashboard](https://tose.sh)
2. Điều hướng đến **Settings** > **API Keys**
3. Nhấp **Create New API Key**
4. Sao chép key (bắt đầu bằng `ws_`)

### Thiết lập API Key

#### Qua gợi ý tương tác

```bash
tose up
# Nhập API key khi được nhắc
```

#### Qua cấu hình thủ công

```bash
mkdir -p ~/.tose
cat > ~/.tose/config.json << 'EOF'
{
  "apiKey": "ws_your_key_here"
}
EOF
```

### Bảo mật

1. **Không commit key**
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

## Cấu hình Workspace

### Workspace mặc định

Đặt workspace mặc định để bỏ qua bước chọn:

```json
{
  "apiKey": "ws_xxxxx",
  "workspaceId": "ws_123456"
}
```

### Xóa Workspace

```bash
rm ~/.tose/config.json
tose up  # Sẽ nhắc lại
```

## Custom API URL

Ghi đè URL API mặc định:

### Qua file cấu hình

```json
{
  "apiKey": "ws_xxxxx",
  "baseUrl": "https://custom-api.tose.sh"
}
```

### Qua biến môi trường

```bash
export TOSE_API_URL="https://custom-api.tose.sh"
tose up
```

## Quản lý cấu hình

### Xem cấu hình hiện tại

```bash
cat ~/.tose/config.json
```

### Sao lưu cấu hình

```bash
cp ~/.tose/config.json ~/.tose/config.json.backup
```

### Reset cấu hình

```bash
rm ~/.tose/config.json
tose up  # Tạo cấu hình mới
```

### Nhiều cấu hình

Cho nhiều tài khoản:

```bash
# Lưu cấu hình
cp ~/.tose/config.json ~/.tose/config.personal.json
cp ~/.tose/config.json ~/.tose/config.work.json

# Chuyển đổi cấu hình
cp ~/.tose/config.work.json ~/.tose/config.json
```

## Khắc phục sự cố

### File cấu hình không tìm thấy

```bash
mkdir -p ~/.tose
```

### Lỗi quyền

```bash
chmod 700 ~/.tose
chmod 600 ~/.tose/config.json
```

### JSON không hợp lệ

Xác thực JSON:
```bash
cat ~/.tose/config.json | python -m json.tool
```

### API Key không hoạt động

1. Xác minh key bắt đầu bằng `ws_`
2. Kiểm tra key chưa bị thu hồi
3. Thử tạo key mới

## Cấu hình nâng cao

### CI/CD

Ví dụ cho GitHub Actions:

```yaml
- name: Setup TOSE Config
  env:
    TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
  run: |
    mkdir -p ~/.tose
    echo "{\"apiKey\":\"$TOSE_API_KEY\"}" > ~/.tose/config.json
```

## Schema cấu hình

```typescript
interface ToseConfig {
  // Bắt buộc: API key
  apiKey: string

  // Tùy chọn: ID workspace mặc định
  workspaceId?: string

  // Tùy chọn: Custom API base URL
  baseUrl?: string
}
```

## Tài liệu liên quan

- [Cài đặt](/vi/guide/installation)
- [Bắt đầu](/vi/guide/getting-started)
- [Biến môi trường](/vi/guide/environment)
- [Xác thực API](/vi/api/authentication)
