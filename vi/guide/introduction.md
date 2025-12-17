# TOSE CLI là gì?

TOSE CLI là một công cụ dòng lệnh mạnh mẽ giúp đơn giản hóa việc triển khai và quản lý ứng dụng. Được xây dựng bằng TypeScript và thiết kế cho nhà phát triển, nó cung cấp giao diện trực quan để triển khai ứng dụng lên nền tảng TOSE.

## Tổng quan

TOSE CLI (`@tosesh/tose`) là công cụ tự động hóa triển khai xử lý:

- **Quản lý dự án** - Tạo và quản lý nhiều dự án trên các workspace
- **Tích hợp Git** - Triển khai trực tiếp từ Git repository của bạn
- **Cấu hình môi trường** - Quản lý biến môi trường với hỗ trợ file .env
- **Giám sát triển khai** - Kiểm tra trạng thái thời gian thực và theo dõi log
- **Cộng tác Workspace** - Quản lý dự án theo nhóm

## Khả năng chính

### 1. Triển khai tương tác

TOSE CLI hướng dẫn bạn qua quy trình triển khai với các gợi ý tương tác:

```bash
tose up
```

CLI sẽ tự động:
- Phát hiện Git repository và nhánh của bạn
- Tìm và merge nhiều file .env
- Xác thực cấu hình của bạn
- Triển khai ứng dụng

### 2. Giá trị mặc định thông minh

TOSE CLI sử dụng các giá trị mặc định thông minh để tối ưu quy trình làm việc:

- Tự động phát hiện URL Git remote từ thư mục hiện tại
- Mặc định là nhánh `main` nếu có sẵn
- Sử dụng cổng 3000 làm cổng mặc định cho ứng dụng
- Cache API key và tùy chọn workspace

### 3. Phản hồi thời gian thực

Nhận phản hồi ngay lập tức về các triển khai của bạn:

```bash
# Kiểm tra trạng thái triển khai
tose status

# Theo dõi log thời gian thực
tose logs --follow

# Xem 50 dòng log cuối cùng
tose logs -n 50
```

## Kiến trúc

TOSE CLI được xây dựng với kiến trúc modular:

```
┌─────────────────────────────────────┐
│      Giao diện CLI                  │
│   (Commander.js + Enquirer)         │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│       Tầng Commands                 │
│  (up, status, logs, down)           │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│       Tầng Services                 │
│ (API Client, Deployment, Publish)   │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│       Tầng Utilities                │
│ (Config, Git, Env, Validation)      │
└─────────────────────────────────────┘
```

## Tính năng cốt lõi

### Tích hợp API

TOSE CLI giao tiếp với TOSE API (`https://api.tose.sh`) sử dụng:

- Các cuộc gọi API RESTful với `node-fetch`
- Xác thực API key qua header `X-API-KEY`
- Xử lý lỗi tự động và logic retry
- Hỗ trợ cả key user-scoped và workspace-scoped

### Quản lý Git Repository

Tích hợp Git liền mạch với:

- Hỗ trợ GitHub, GitLab và Bitbucket
- Cả định dạng URL HTTPS và SSH
- Tự động hoàn thành và xác thực nhánh
- Liên kết repository với dự án

### Xử lý biến môi trường

Quản lý biến môi trường nâng cao:

- Hỗ trợ nhiều file .env (`.env`, `.env.local`, `.env.production`)
- Tự động merge với phát hiện xung đột
- Che giấu giá trị nhạy cảm (password, token, API key)
- Xem trước trước khi triển khai

### Lưu trữ cấu hình

Lưu trữ cấu hình cục bộ tại `~/.tose/config.json`:

```json
{
  "apiKey": "ws_xxxxx...",
  "workspaceId": "ws_123...",
  "baseUrl": "https://api.tose.sh"
}
```

## Stack công nghệ

TOSE CLI được xây dựng với các công nghệ hiện đại, đáng tin cậy:

- **Ngôn ngữ**: TypeScript 5.9+
- **Runtime**: Node.js 14+
- **CLI Framework**: Commander.js 14.x
- **Prompts**: Enquirer 2.x
- **HTTP Client**: node-fetch 2.x
- **UI**: Chalk (màu sắc) + Ora (spinner)

## Trường hợp sử dụng

### Dự án cá nhân

Hoàn hảo cho nhà phát triển cá nhân:
- Triển khai nhanh từ môi trường phát triển local
- Quản lý dự án đơn giản
- Cấu hình môi trường dễ dàng

### Cộng tác nhóm

Tuyệt vời cho các nhóm:
- Workspace chia sẻ
- Nhiều dự án mỗi workspace
- API key theo workspace
- Quy trình triển khai nhất quán

### Tích hợp CI/CD

Có thể tích hợp vào pipeline tự động:
- Các lệnh có thể viết script
- Hỗ trợ biến môi trường
- Kiểm tra trạng thái để xác minh
- Đầu ra log để debug

## Triết lý

TOSE CLI tuân theo các nguyên tắc thiết kế này:

1. **Trải nghiệm nhà phát triển trên hết** - Gợi ý tương tác, lỗi hữu ích và giá trị mặc định thông minh
2. **An toàn mặc định** - Gợi ý xác nhận, xem trước cấu hình và xác thực
3. **Minh bạch** - Phản hồi rõ ràng về các hoạt động và ghi log chi tiết
4. **Linh hoạt** - Hỗ trợ nhiều nhà cung cấp Git, môi trường và quy trình làm việc
5. **Hiệu suất** - Hoạt động nhanh với cache và các cuộc gọi API hiệu quả

## Phiên bản & Hỗ trợ

- **Phiên bản hiện tại**: 0.0.2
- **Giấy phép**: ISC
- **Package**: `@tosesh/tose` (npm)
- **Hỗ trợ**: tobi@wearetopgroup.com

## Tiếp theo là gì?

Sẵn sàng bắt đầu? Xem các hướng dẫn sau:

- [Cài đặt](/vi/guide/installation) - Cài đặt TOSE CLI trên hệ thống
- [Bắt đầu](/vi/guide/getting-started) - Triển khai ứng dụng đầu tiên
- [Tổng quan lệnh](/vi/commands/overview) - Tìm hiểu về tất cả các lệnh có sẵn
- [Cấu hình](/vi/guide/configuration) - Cấu hình TOSE CLI theo nhu cầu
