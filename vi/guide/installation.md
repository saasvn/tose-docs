# Cài đặt

Hướng dẫn này sẽ giúp bạn cài đặt TOSE CLI trên hệ thống.

## Yêu cầu

Trước khi cài đặt TOSE CLI, đảm bảo bạn có:

- **Node.js** phiên bản 14.0.0 trở lên
- **npm** hoặc **yarn** package manager
- **Git** (tùy chọn, cho tính năng tích hợp Git)
- Tài khoản **TOSE** với API key

::: tip Kiểm tra phiên bản Node.js
Chạy `node --version` để kiểm tra phiên bản Node.js. Nếu cần cài đặt hoặc nâng cấp Node.js, truy cập [nodejs.org](https://nodejs.org/).
:::

## Cài đặt qua npm

### Cài đặt toàn cục (Khuyến nghị)

Cài đặt TOSE CLI toàn cục để sử dụng lệnh `tose` từ mọi nơi:

```bash
npm install -g @tosesh/tose
```

Xác minh cài đặt:

```bash
tose --version
```

Bạn sẽ thấy đầu ra như:

```
1.0.0
```

### Cài đặt cục bộ

Cho cài đặt theo dự án:

```bash
npm install @tosesh/tose
```

Sau đó sử dụng qua npx:

```bash
npx tose up
```

Hoặc thêm scripts vào `package.json`:

```json
{
  "scripts": {
    "deploy": "tose up",
    "status": "tose status",
    "logs": "tose logs"
  }
}
```

## Cài đặt qua Yarn

### Cài đặt toàn cục

```bash
yarn global add @tosesh/tose
```

### Cài đặt cục bộ

```bash
yarn add @tosesh/tose
```

## Xác minh cài đặt

Sau khi cài đặt, xác minh TOSE CLI hoạt động:

```bash
tose --help
```

Bạn sẽ thấy đầu ra trợ giúp:

```
Usage: tose [options] [command]

TOSE CLI - Deploy and manage your applications

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  up              Deploy or manage your project
  status          Check deployment status
  logs            View deployment logs
  down            Stop deployment
  help [command]  display help for command
```

## Lấy API Key

Để sử dụng TOSE CLI, bạn cần một API key:

1. Đăng ký hoặc đăng nhập tại [https://tose.sh](https://tose.sh)
2. Điều hướng đến **Settings** > **API Keys**
3. Nhấp **Create New API Key**
4. Sao chép key (bắt đầu bằng `ws_`)
5. Giữ an toàn - bạn sẽ cần nó cho thiết lập lần đầu

::: warning Giữ API Key an toàn
Không bao giờ commit API key vào version control hoặc chia sẻ công khai. TOSE CLI lưu trữ nó an toàn trong `~/.tose/config.json`.
:::

## Thiết lập lần đầu

Khi chạy lần đầu, TOSE CLI sẽ nhắc nhập API key:

```bash
tose up
```

Làm theo các gợi ý:

1. **Nhập API Key**: Dán API key của bạn
2. **Chọn Workspace**: Chọn hoặc tạo workspace
3. Tiếp tục thiết lập triển khai

API key và tùy chọn workspace sẽ được lưu cục bộ cho việc sử dụng sau.

## Vị trí cấu hình

TOSE CLI lưu trữ cấu hình trong:

```
~/.tose/config.json
```

Ví dụ cấu hình:

```json
{
  "apiKey": "ws_xxxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

## Cập nhật TOSE CLI

Để cập nhật lên phiên bản mới nhất:

### npm

```bash
npm update -g @tosesh/tose
```

### yarn

```bash
yarn global upgrade @tosesh/tose
```

Kiểm tra phiên bản mới:

```bash
tose --version
```

## Gỡ cài đặt

Để xóa TOSE CLI:

### npm

```bash
npm uninstall -g @tosesh/tose
```

### yarn

```bash
yarn global remove @tosesh/tose
```

Tùy chọn, xóa cấu hình:

```bash
rm -rf ~/.tose
```

## Khắc phục sự cố

### Lệnh không tìm thấy

Nếu bạn nhận được `tose: command not found` sau khi cài đặt toàn cục:

**Trên macOS/Linux:**

1. Kiểm tra đường dẫn npm global bin:
   ```bash
   npm config get prefix
   ```

2. Thêm vào PATH trong `~/.bashrc` hoặc `~/.zshrc`:
   ```bash
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

3. Tải lại shell:
   ```bash
   source ~/.bashrc  # hoặc ~/.zshrc
   ```

**Trên Windows:**

1. Kiểm tra đường dẫn npm global:
   ```cmd
   npm config get prefix
   ```

2. Thêm đường dẫn vào biến môi trường PATH của hệ thống

### Lỗi quyền

Nếu gặp lỗi quyền trên macOS/Linux:

```bash
sudo npm install -g @tosesh/tose
```

Hoặc cấu hình npm để sử dụng thư mục khác:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Vấn đề mạng

Nếu cài đặt thất bại do vấn đề mạng:

1. Thử sử dụng registry npm khác:
   ```bash
   npm install -g @tosesh/tose --registry=https://registry.npmjs.org/
   ```

2. Kiểm tra cài đặt proxy:
   ```bash
   npm config get proxy
   npm config get https-proxy
   ```

### Module không tìm thấy

Nếu gặp lỗi module sau khi cài đặt:

```bash
# Xóa cache npm
npm cache clean --force

# Cài đặt lại
npm install -g @tosesh/tose
```

## Tiếp theo

Bây giờ TOSE CLI đã được cài đặt:

1. [Bắt đầu](/vi/guide/getting-started) - Triển khai ứng dụng đầu tiên
2. [Tổng quan lệnh](/vi/commands/overview) - Tìm hiểu về các lệnh có sẵn
3. [Cấu hình](/vi/guide/configuration) - Cấu hình TOSE CLI

## Hỗ trợ

Gặp vấn đề với cài đặt?

- Kiểm tra [GitHub Issues](https://github.com/tosesh/tose/issues)
- Email: tobi@wearetopgroup.com
