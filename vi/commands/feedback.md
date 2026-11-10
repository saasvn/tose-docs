# tose feedback

Báo lỗi hoặc đề xuất tính năng cho đội TOSE mà không cần tài khoản hay token GitHub.

CLI gửi báo cáo tới API TOSE (`POST /api/feedback`) kèm API key của bạn, rồi TOSE chuyển đến đúng nơi theo dõi. CLI không bao giờ tự chọn repository và không gọi GitHub.

Mọi lệnh đều nhận `--json`.

## Tóm tắt

```bash
tose feedback [submit] [--type <type>] [--component <name>] [--title <text>] [--message <text>] \
  [--reproduction <text>] [--request-id <id>] [--error-code <code>] \
  [--include-diagnostics] [--idempotency-key <key>] [--dry-run]
tose feedback status <feedback_id>
```

## tose feedback submit

`submit` là lệnh con mặc định, nên `tose feedback` và `tose feedback submit` làm cùng một việc.

Trong terminal, lệnh hỏi loại, thành phần, tiêu đề và nội dung, hiển thị bản xem trước đúng với nội dung sẽ gửi, và chỉ gửi sau khi bạn xác nhận.

Với script và agent, truyền các trường bằng flag:

```bash
tose --json --non-interactive feedback submit --type bug --component cli \
  --title "deploy hangs" --message "tose deploy never finishes" \
  --reproduction "run tose deploy in an empty project" --request-id req_123
```

Khi không có terminal, bắt buộc phải có `--type`, `--title` và `--message`.

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--type <type>` | `bug`, `feature`, `docs`, `ux` hoặc `billing` |
| `--component <name>` | `cli` (mặc định), `api` (nền tảng và dashboard), `web` hoặc `docs`. `app` là tên cũ của `api`, vẫn dùng được nhưng CLI sẽ in cảnh báo |
| `--title <text>` | Tóm tắt ngắn, tối đa 120 ký tự |
| `--message <text>` | Điều đã xảy ra hoặc điều bạn cần, tối đa 8000 ký tự |
| `--reproduction <text>` | Các bước tái hiện, tối đa 4000 ký tự (tùy chọn) |
| `--request-id <id>` | Request ID của lệnh gọi API bị lỗi, tối đa 128 ký tự (tùy chọn) |
| `--error-code <code>` | Mã lỗi bạn nhận được, tối đa 64 ký tự (tùy chọn). Cần `--include-diagnostics` |
| `--include-diagnostics` | Gửi thêm phiên bản CLI, hệ điều hành và kiến trúc CPU. Đây là sự đồng ý rõ ràng của bạn |
| `--idempotency-key <key>` | Để việc gửi lại chỉ ghi nhận báo cáo một lần, tối đa 128 ký tự. Nếu bỏ qua, key được tạo từ báo cáo |
| `--dry-run` | In đúng nội dung sẽ được gửi, không gửi |

`--request-id`, `--error-code` và `--idempotency-key` chỉ nhận chữ cái, chữ số và `_ . : -`. CLI kiểm tra các giá trị này trước khi gửi.

### Những gì được gửi

Báo cáo gồm loại, thành phần, tiêu đề và nội dung bạn viết, cùng các bước tái hiện và request ID nếu bạn có nhập. Khi bạn chưa đồng ý, CLI không gửi thông tin nào về môi trường: không có tên workspace hay project, không có đường dẫn.

Với `--include-diagnostics` (hoặc trả lời có trong terminal), báo cáo gửi thêm các thông tin chẩn đoán sau, và chỉ có vậy:

| Trường | Giá trị |
|--------|---------|
| `client` | `tose-cli` |
| `client_version` | Phiên bản CLI |
| `os` | Tên hệ điều hành, ví dụ `darwin` hoặc `linux` |
| `arch` | Kiến trúc CPU, ví dụ `arm64` hoặc `x64` |

`--error-code` chỉ được gửi cùng thông tin chẩn đoán, nên CLI từ chối flag này nếu thiếu `--include-diagnostics`. CLI không bao giờ đọc file `.env`, mã nguồn hay lịch sử shell.

### Che thông tin nhạy cảm

Key, bearer token, cookie, URL có kèm thông tin đăng nhập và các phép gán trông như secret được che trước khi gửi, và server che thêm một lần nữa. Dùng `--dry-run` để xem báo cáo đã che trước khi gửi.

### Gửi lại an toàn

Idempotency key được tạo từ toàn bộ nội dung báo cáo, nên gửi lại cùng một báo cáo chỉ được ghi nhận một lần. Tự đặt `--idempotency-key` nếu bạn muốn kiểm soát việc này.

## tose feedback status

Kiểm tra một báo cáo bạn đã gửi trước đó.

```bash
tose feedback status <feedback_id>
```

## Kết quả

Với `--json`, lệnh in một JSON envelope. Phần `data` có các trường:

| Trường | Ý nghĩa |
|--------|---------|
| `feedback_id` | ID để truyền cho `tose feedback status` |
| `status` | Trạng thái báo cáo (xem bên dưới) |
| `issue_url` | Liên kết tới issue trên nơi theo dõi, hoặc `null` |
| `idempotency_key` | Key đã dùng khi gửi báo cáo (chỉ có ở `submit`) |

| Trạng thái | Ý nghĩa |
|------------|---------|
| `received` | Đã lưu và đang xếp hàng |
| `triaged` | Đã phân loại, đang chờ đăng |
| `published` | Đã đăng thành issue |
| `duplicate` | Trùng một báo cáo đã có; báo cáo của bạn được liên kết với báo cáo đó |
| `publication_failed` | Đã lưu nhưng đăng thất bại. TOSE sẽ thử lại |
| `rejected` | Bị kiểm duyệt từ chối và không được đăng |

`status` của envelope là `ok` với `published` và `duplicate`, và là `pending` khi báo cáo còn đang chờ. `issue_url` chỉ xuất hiện khi server xác nhận issue đã tồn tại, nên hãy kiểm tra lại sau bằng `tose feedback status`.

Báo cáo có trạng thái `rejected` thoát với mã `8`.

## Liên quan

- [Tổng quan lệnh](/vi/commands/overview)
- [Xác thực](/vi/api/authentication)
