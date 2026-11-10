# tose down

Dừng dự án: đưa ứng dụng về 0 replica và hủy các bản build chưa tới bước deploy.

## Tóm tắt

```bash
tose down [project] [-y]
```

## Mô tả

Nếu dự án có triển khai `running`, `tose down` dừng triển khai đó, kể cả khi có một bản build mới hơn đang chạy. Việc này đưa ứng dụng về 0 replica **và** hủy các bản build của dự án chưa tới bước deploy (`pending`, `cloning`, `building`, `pushing`). Khi không có gì đang chạy, lệnh chỉ hủy bản build mới nhất.

Sau khi dừng, CLI đọc lại triển khai và danh sách triển khai của dự án rồi báo trạng thái **cuối cùng**. CLI không bao giờ in `stopped` cho một lần dừng không có hiệu lực. Xem [Điều gì xảy ra khi dừng](#đieu-gi-xay-ra-khi-dung) và [Mã thoát](#ma-thoat).

## Tham số

| Tham số | Mô tả |
|---------|-------|
| `[project]` | Tùy chọn. Slug dự án hoặc `workspace/project` |

## Tùy chọn

| Tùy chọn | Alias | Mô tả |
|----------|-------|-------|
| `--yes` | `-y` | Bỏ qua câu hỏi xác nhận. Bắt buộc khi không có terminal hoặc khi dùng `--json` |

## Sử dụng

**Dừng có xác nhận:**

```bash
$ tose down

Stop deployment for my-workspace/my-app? No
? Confirm: Yes

✓ Project stopped
  Deployment dep_abc123 is now stopped.
  Builds of this project that had not reached deploy were cancelled too.
```

**Dừng một dự án cụ thể, bỏ qua xác nhận:**

```bash
tose down my-workspace/my-app -y
```

**Dự án đang bận (CLI tự thử lại):**

```bash
$ tose down -y

⠹ Project is busy; retrying the stop in 12s (attempt 1/4)...
✓ Project stopped
```

### Kết quả JSON

```bash
tose down -y --json
```

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "stopped"
  }
}
```

## Điều gì xảy ra khi dừng

1. Ứng dụng nhận tín hiệu tắt graceful
2. Các kết nối đang hoạt động được chờ hoàn tất
3. Container bị chấm dứt
4. Trạng thái triển khai chuyển thành `stopped`

Dừng một triển khai `running` sẽ dừng **toàn bộ dự án**. Trong một lần ghi có khoá, mọi triển khai của dự án đang `running` hoặc `deploying`, và mọi triển khai còn ở trước bước deploy (`pending`, `cloning`, `building`, `pushing`), được đánh dấu `stopped`. Dự án giữ ở 0 replica cho đến khi bạn deploy lại.

- Chỉ các triển khai được tạo trước khi Stop bắt đầu bị ảnh hưởng. Deploy được yêu cầu sau đó vẫn build và phát hành bình thường.
- Bản build bị dừng không có deploy, không gửi email và không có sự kiện thành công hay thất bại.
- Dừng một triển khai `deploying` hoàn tất bất đồng bộ. Builder khôi phục phiên bản phục vụ gần nhất nếu có, nếu không thì scale workload về 0. Triển khai có thể kết thúc ở `running` kèm lý do trong `error_message` nếu image của nó vẫn đang phục vụ.
- Nếu không lấy được khoá workload của dự án trong 60 giây, API trả về `503 Service Unavailable` kèm header `Retry-After` và chưa có gì bị dừng. Xem [Thử lại và timeout](#thu-lai-va-timeout).
- Redeploy sau đó không bao giờ chọn image của rollout đã bị huỷ.

Xem [Dừng triển khai](/vi/api/reference#dung-trien-khai) trong tài liệu API.

### Thử lại và timeout

- **503 kèm `Retry-After`:** chưa có gì bị dừng. CLI chờ đúng thời gian `Retry-After` (tối đa 60 giây, hoặc 5 giây nếu không có header) rồi gửi lại yêu cầu Stop, tối đa 4 lần thử.
- **Vẫn bận sau 4 lần:** lệnh thất bại với `OPERATION_FAILED` (mã thoát `8`, `retryable: true`). Thông báo nói rõ việc dừng **chưa** xảy ra; hãy chạy lại `tose down` sau một phút.
- **Timeout:** CLI chờ yêu cầu Stop tối đa khoảng 100 giây. Hết thời gian đó, lệnh thất bại với `TIMEOUT` (mã thoát `7`, `retryable: true`) và kết quả được đánh dấu chưa rõ (`details.stop_outcome: "unknown"`). Máy chủ vẫn có thể đã dừng xong, nên hãy chạy [`tose status`](/vi/commands/status) trước khi thử lại.

### Trạng thái cuối cùng

Sau khi yêu cầu Stop được chấp nhận, CLI đọc lại triển khai (chờ tối đa khoảng 30 giây nếu nó còn `deploying`) rồi đọc danh sách triển khai của dự án:

- Triển khai là `stopped` và không còn triển khai nào của dự án ở `running`: thành công, mã thoát `0`.
- Triển khai, hoặc một triển khai khác của dự án, kết thúc ở `running` trở lại (ví dụ image của chính rollout đó vẫn đang phục vụ): lệnh thất bại với `OPERATION_FAILED` (mã thoát `8`) kèm `error_message` của triển khai. Lệnh không khẳng định `stopped`.
- Triển khai vẫn `deploying` sau thời gian chờ: lệnh thất bại với `TIMEOUT` (mã thoát `7`). Chạy `tose status` để xem trạng thái cuối.

### Mã thoát

| Mã | Tên | Khi nào |
|----|-----|---------|
| `0` | `SUCCESS` | Dự án đã dừng, hoặc bản build duy nhất đã bị hủy |
| `4` | `CONFIRMATION_REQUIRED` | Không có terminal, hoặc dùng `--json`, mà thiếu `--yes`. Không gửi gì |
| `5` | `CANCELLED` | Bạn từ chối câu hỏi xác nhận |
| `6` | `NOT_FOUND` | Dự án chưa có triển khai nào |
| `7` | `TIMEOUT` | Yêu cầu Stop hết thời gian (chưa rõ kết quả), hoặc triển khai vẫn `deploying` sau khi dừng |
| `8` | `OPERATION_FAILED` | Dự án vẫn bận sau 4 lần thử, hoặc việc dừng kết thúc với một triển khai `running` trở lại |

Triển khai mới nhất đã ở `stopped`, `failed` hoặc trạng thái kết thúc khác không phải lỗi: CLI cảnh báo và thoát với mã `0` mà không gửi yêu cầu. Danh sách đầy đủ xem [Mã thoát](/vi/commands/overview#exit-codes).

`tose deployment cancel <id>` dùng cùng cơ chế thử lại và kiểm tra trạng thái cuối. Xem [`tose deployment cancel`](/vi/commands/deployment#tose-deployment-cancel).

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra triển khai đã dừng chưa
- [`tose deployment cancel`](/vi/commands/deployment#tose-deployment-cancel) - Hủy một bản build theo ID
- [`tose up`](/vi/commands/up) - Triển khai lại sau khi dừng
- [`tose logs`](/vi/commands/logs) - Xem logs trước khi dừng
