# tose deployment

Làm việc với một triển khai theo ID: chờ nó hoàn tất, hủy, hoặc rollback.

ID triển khai cũng là ID task. Bạn lấy ID từ `tose deploy`, `tose status` hoặc `tose deploy --json`.

| Lệnh | Tác dụng | Xác nhận |
|------|----------|----------|
| `tose deployment wait <id>` | Tiếp tục chờ triển khai chạy ổn định | Không |
| `tose deployment cancel <id> [project]` | Hủy triển khai đang build | `--yes` |
| `tose deployment rollback <id> [project]` | Rollback về image của một triển khai trước | `--yes` |

## tose deployment cancel

Hủy một triển khai chưa tới bước deploy.

### Tóm tắt

```bash
tose deployment cancel <id> [project] --yes
```

### Hành vi

- Chỉ hủy được triển khai còn đang xử lý (`pending`, `cloning`, `building`, `pushing`, `deploying`). Trạng thái khác bị từ chối với mã thoát `1` (`CONFLICT`). Để dừng dự án đang `running`, dùng [`tose down`](/vi/commands/down).
- Đây là lệnh phá hủy nên theo cùng quy tắc xác nhận như rollback: hỏi trong terminal (từ chối thì thoát mã `5`), và cần `--yes` khi không có terminal hoặc khi dùng `--json` (nếu không thì thoát mã `4`).
- Dùng cùng cơ chế thử lại và kiểm tra trạng thái cuối như `tose down`. `503` kèm `Retry-After` được thử lại tối đa 4 lần (mỗi lần chờ đúng thời gian `Retry-After`, tối đa 60 giây, hoặc 5 giây nếu không có); sau đó lệnh thất bại với `OPERATION_FAILED` (mã thoát `8`, có thể thử lại) và nói rõ việc dừng chưa xảy ra. Yêu cầu Stop chạy quá khoảng 100 giây sẽ thất bại với `TIMEOUT` (mã thoát `7`) và kết quả chưa rõ.
- Sau khi dừng, triển khai được đọc lại. Nếu nó không phải `stopped` (ví dụ kết thúc ở `running` trở lại), lệnh thất bại với `OPERATION_FAILED` kèm `error_message` thay vì in `cancelled`; nếu còn `deploying` thì thất bại với `TIMEOUT`.

```bash
$ tose deployment cancel dep_abc123 --yes
Deployment dep_abc123 cancelled.
```

Chi tiết thử lại và mã thoát xem [`tose down`](/vi/commands/down#thu-lai-va-timeout).

## tose deployment rollback

Đưa dự án về image của một triển khai trước đó.

### Tóm tắt

```bash
tose deployment rollback <id> [project] --yes
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `<id>` | Triển khai cần rollback về |
| `[project]` | Tùy chọn. Slug dự án hoặc `workspace/project` |

### Xác nhận

Rollback thay thế thứ đang chạy, nên đây là lệnh phá hủy và không bao giờ chạy khi chưa được xác nhận rõ ràng:

- Trong terminal tương tác, CLI hiển thị đối tượng và tác động rồi hỏi một câu mặc định là No. Từ chối thì không thay đổi gì và thoát với mã `5`.
- Không có terminal, hoặc khi dùng `--json` hay `--non-interactive`, lệnh từ chối trước khi gửi bất kỳ request thay đổi dữ liệu nào và thoát với mã `4` (`CONFIRMATION_REQUIRED`). Chạy lại với `--yes`. CLI vẫn có thể đọc trước triển khai đích để kiểm tra.

`--yes` chỉ chấp thuận lệnh mà nó được viết kèm. API vẫn kiểm tra quyền của key.

```bash
# Khi không có terminal (CI, script, agent)
tose deployment rollback dep_abc123 --json   # thoát mã 4, không gửi request ghi
tose deployment rollback dep_abc123 --yes
```

Triển khai đích đã thất bại hoặc đang chạy dở bị từ chối với mã thoát `1` (`CONFLICT`), còn đích không tồn tại bị từ chối với mã `6` (`NOT_FOUND`), dù bạn có truyền `--yes` hay không.

### Rollback khôi phục gì

Rollback chạy lại image của triển khai trước cho dự án hiện tại. Nó giữ biến môi trường và cấu hình hiện tại, và không khôi phục schema hay dữ liệu database. API ghi điều này trong biên nhận rollback có bốn lớp: `artifact` (được quay lại) và `config`, `schema`, `data` (không). Với `--json`, bản ghi triển khai được in có kèm `rollback_receipt` khi API trả về; đầu ra thường không hiển thị. CLI chưa có lệnh đọc lại biên nhận; hãy dùng `GET .../deployments/{id}/rollback-receipt`. Xem [Biên nhận rollback](/vi/api/projects#rollback-receipts).

::: tip Agent
Rollback cũng có qua connector MCP, nơi nó cần bạn duyệt trong trình duyệt. Xem [Agent access](/vi/mcp/agent-access).
:::

## Lệnh liên quan

- [`tose deploy`](/commands/deploy) - Bắt đầu triển khai
- [`tose status`](/vi/commands/status) - Tìm ID triển khai
- [`tose runbook`](/vi/commands/runbook) - Lập kế hoạch rollback do người duyệt trong trình duyệt
- [`tose skills install safe-rollback`](/vi/commands/skills) - Dạy agent quy trình rollback an toàn
