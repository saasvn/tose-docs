---
title: "Triển khai ứng dụng bằng TOSE CLI"
description: "Từng bước: cài TOSE CLI, đăng nhập bằng API key, triển khai một kho Git bằng tose up và kiểm tra deployment."
---

# Triển khai ứng dụng bằng CLI

Triển khai một kho Git lên TOSE từ terminal và xác nhận ứng dụng đang chạy.

## Điều kiện cần

- Node.js 18 trở lên (yêu cầu `engines` của `@tosesh/tose`).
- Tài khoản TOSE và API key của workspace cần triển khai. Key bắt đầu bằng `tose_sk_`; xem [API key](/vi/api/api-keys).
- Dự án trong một kho Git trên GitHub, có `Dockerfile`. Nếu chưa có, chạy [`tose generate`](/commands/generate) (tiếng Anh).
- Ví của workspace còn số dư. TOSE trả trước; xem [Bảng giá](/vi/guide/pricing).

## Đầu vào

| Giá trị | Lấy từ đâu |
|---------|------------|
| API key | Dashboard, **Settings → API Keys** |
| Workspace và project | Chọn ở lời nhắc của `tose up`, hoặc dùng `--workspace` và `--project` |
| Biến môi trường | Không bắt buộc. Truyền file bằng `--env-file`; không có nó hoặc không đồng ý ở lời nhắc thì không có gì được tải lên |

## Các bước

1. Cài CLI:

   ```bash
   npm install -g @tosesh/tose
   ```

2. Đăng nhập. Key được kiểm tra và lưu vào `~/.tose/config.json`:

   ```bash
   tose login
   ```

   Trong CI, đặt `TOSE_API_KEY`. Key chỉ dùng cho lần chạy đó và chỉ được lưu khi chạy `tose login --save`.

3. Trong thư mục kho mã, tạo hoặc liên kết project rồi triển khai:

   ```bash
   cd my-app
   tose up
   ```

   `tose up` liên kết thư mục, kết nối kho Git, gán server và bắt đầu một deployment từ commit mới nhất của nhánh.

4. Theo dõi build:

   ```bash
   tose logs --build -f
   ```

## Kết quả mong đợi

`tose up` in ra ID deployment và URL của project. Deployment chuyển `pending` → `building` → `deploying` → `running`. Build lỗi sẽ kết thúc ở `failed`.

## Kiểm tra

```bash
tose status          # trạng thái project, sức khỏe pod và deployment mới nhất
tose open            # mở URL của project
tose doctor          # kiểm tra xác thực, Git, server, cổng, hạn mức, health và DNS/SSL
```

Trong script, `tose deploy --wait` chỉ trả về khi deployment đang chạy và mọi pod sẵn sàng; mọi lệnh đều nhận `--json`.

## Quyền và bảo mật

- Triển khai cần vai trò owner hoặc admin trong workspace. Key bị giới hạn scope cần `deployments:execute`; xem [scope](/vi/api/api-keys#scope).
- Không truyền key trên dòng lệnh hay trong URL. Dùng lời nhắc, `--api-key-stdin` hoặc `TOSE_API_KEY`.
- `tose up` chỉ tải giá trị `.env` lên khi có `--env-file` hoặc bạn đồng ý rõ ràng.

## Thử lại an toàn

Deploy không idempotent: mỗi lần `tose deploy` tạo một deployment mới và xếp thêm một build. Nếu lệnh bị ngắt giữa chừng, kiểm tra `tose status` hoặc [`tose deployment`](/vi/commands/deployment) trước khi chạy lại. Dùng `tose deploy --dry-run` để xem kế hoạch mà không thay đổi gì.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| `tose: command not found` | Kiểm tra thư mục bin toàn cục của npm có trong `PATH`; xem [Cài đặt](/vi/guide/installation#khắc-phục-sự-cố). |
| Chưa đăng nhập hoặc key sai | Chạy lại `tose login`, hoặc kiểm tra `TOSE_API_KEY`. |
| Build lỗi | Đọc `tose logs --build`; xem [ví dụ Dockerfile](/vi/guide/dockerfile). |
| Cần thanh toán | Nạp thêm tiền vào ví workspace; xem [Mã lỗi](/vi/api/errors#payment_required). |
| Đang có deploy chạy | Chờ bằng `tose status`, rồi deploy lại. |

Thêm ở [Troubleshooting](/guide/troubleshooting) (tiếng Anh).

## Bước tiếp theo

- [Biến môi trường](/vi/guide/environment) và [tên miền tùy chỉnh](/vi/guide/custom-domains)
- [Tất cả lệnh CLI](/vi/commands/overview)
- Để AI agent vận hành project: [Kết nối AI agent](/vi/guide/connect-an-agent)
