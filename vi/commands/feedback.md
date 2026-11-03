# tose feedback

Báo lỗi hoặc đề xuất tính năng cho đội TOSE mà không cần tài khoản hay token GitHub.

CLI gửi báo cáo tới API TOSE (`POST /api/feedback`) kèm API key của bạn, rồi TOSE chuyển đến đúng nơi theo dõi. CLI không bao giờ tự chọn repository và không gọi GitHub.

Mọi lệnh đều nhận `--json`.

## Tóm tắt

```bash
tose feedback [--type <type>] [--component <name>] [--title <text>] [--message <text>] \
  [--reproduction <text>] [--request-id <id>] [--error-code <code>] \
  [--include-diagnostics] [--log-file <path>] [--idempotency-key <key>] [--dry-run]
tose feedback status <feedback_id>
```

## tose feedback

Trong terminal, `tose feedback` hỏi loại, tiêu đề và nội dung, hiển thị bản xem trước đúng với nội dung sẽ gửi, và chỉ gửi sau khi bạn xác nhận.

Với script và agent, truyền các trường bằng flag:

```bash
tose --json --non-interactive feedback --type bug --component cli \
  --title "deploy hangs" --message "tose deploy never finishes" \
  --reproduction "run tose deploy in an empty project" --request-id req_123
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--type <type>` | `bug`, `feature`, `docs`, `ux` hoặc `billing` |
| `--component <name>` | `cli` (mặc định), `app`, `web` hoặc `docs` |
| `--title <text>` | Tóm tắt ngắn, tối đa 120 ký tự |
| `--message <text>` | Điều đã xảy ra hoặc điều bạn cần, tối đa 8000 ký tự |
| `--reproduction <text>` | Các bước tái hiện (tùy chọn) |
| `--request-id <id>` | Request ID của lệnh gọi API bị lỗi (tùy chọn) |
| `--error-code <code>` | Mã lỗi bạn nhận được (tùy chọn) |
| `--include-diagnostics` | Gửi thêm phiên bản Node, kiến trúc CPU, bản phát hành OS và host API. Đây là sự đồng ý rõ ràng của bạn |
| `--log-file <path>` | Đính kèm 16 KiB cuối của file đó, đã được che thông tin nhạy cảm. Cần `--include-diagnostics` |
| `--idempotency-key <key>` | Để việc gửi lại chỉ ghi nhận báo cáo một lần. Nếu bỏ qua, key được tạo từ nội dung báo cáo |
| `--dry-run` | In đúng nội dung sẽ được gửi, không gửi |

### Những gì được gửi

Luôn được gửi: loại, thành phần, tiêu đề và nội dung bạn viết, cùng phiên bản CLI, `node` làm runtime và tên hệ điều hành. Không gửi gì khác về máy của bạn, không có tên workspace hay project và không có đường dẫn.

Với `--include-diagnostics` (hoặc trả lời có trong terminal), báo cáo gửi thêm phiên bản Node, kiến trúc CPU, bản phát hành OS và host API. `--log-file <path>` đính kèm thêm 16 KiB cuối của file đó và cần `--include-diagnostics`. File dotenv bị từ chối. CLI không bao giờ đọc mã nguồn hay lịch sử shell.

### Che thông tin nhạy cảm

Key, bearer token, cookie, URL có kèm thông tin đăng nhập và các phép gán trông như secret được che trước khi gửi, và server che thêm một lần nữa. Dùng `--dry-run` để xem báo cáo đã che trước khi gửi.

### Gửi lại an toàn

Idempotency key được tạo từ nội dung báo cáo, nên gửi lại cùng một báo cáo chỉ được ghi nhận một lần. Tự đặt `--idempotency-key` nếu bạn muốn kiểm soát việc này.

## tose feedback status

Kiểm tra một báo cáo bạn đã gửi trước đó.

```bash
tose feedback status <feedback_id>
```

## Kết quả

Với `--json`, lệnh in một JSON envelope:

| Trường | Ý nghĩa |
|--------|---------|
| `feedback_id` | ID để truyền cho `tose feedback status` |
| `status` | Trạng thái báo cáo, ví dụ `pending` hoặc `rejected` |
| `duplicate_of` | ID của báo cáo trước đó mà báo cáo này trùng, khi TOSE tìm thấy |
| `issue_url` | Liên kết tới issue trên nơi theo dõi |

Báo cáo đang xếp hàng có `status: "pending"` và chưa có `issue_url`. URL chỉ xuất hiện khi server xác nhận issue đã tồn tại, nên hãy kiểm tra lại sau bằng `tose feedback status`.

Báo cáo có trạng thái `rejected` thoát với mã `8`.

## Liên quan

- [Tổng quan lệnh](/vi/commands/overview)
- [Xác thực](/vi/api/authentication)
