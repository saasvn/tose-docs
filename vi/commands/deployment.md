# tose deployment

Làm việc với một triển khai theo ID: chờ nó hoàn tất, hủy, hoặc rollback.

ID triển khai cũng là ID task. Bạn lấy ID từ `tose deploy`, `tose status` hoặc `tose deploy --json`.

| Lệnh | Tác dụng | Xác nhận |
|------|----------|----------|
| `tose deployment wait <id>` | Tiếp tục chờ triển khai chạy ổn định | Không |
| `tose deployment cancel <id>` | Hủy triển khai đang build | `--yes` |
| `tose deployment rollback <id> [project]` | Rollback về image của một triển khai trước | `--yes` |

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

::: tip Agent
Rollback cũng có qua connector MCP, nơi nó cần bạn duyệt trong trình duyệt. Xem [Agent access](/vi/mcp/agent-access).
:::

## Lệnh liên quan

- [`tose deploy`](/commands/deploy) - Bắt đầu triển khai
- [`tose status`](/vi/commands/status) - Tìm ID triển khai
- [`tose skills install safe-rollback`](/vi/commands/skills) - Dạy agent quy trình rollback an toàn
