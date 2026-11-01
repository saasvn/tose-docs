# tose deployment

Làm việc với một triển khai theo ID: chờ nó hoàn tất, huỷ, hoặc rollback.

ID triển khai cũng là ID task. Bạn lấy ID từ `tose deploy`, `tose status` hoặc `tose deploy --json`.

| Lệnh | Tác dụng | Xác nhận |
|------|----------|----------|
| `tose deployment wait <id>` | Tiếp tục chờ triển khai chạy ổn định | Không |
| `tose deployment cancel <id>` | Huỷ triển khai đang build | `--yes` |
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

Rollback thay thế thứ đang chạy, nên đây là lệnh phá huỷ và không bao giờ chạy khi chưa được xác nhận rõ ràng:

- Trong terminal tương tác, CLI hiển thị đối tượng và tác động rồi hỏi một câu mặc định là No. Từ chối thì không thay đổi gì và thoát với mã `5`.
- Không có terminal, hoặc khi dùng `--json`, lệnh từ chối trước khi gửi bất cứ thứ gì và thoát với mã `4` (`CONFIRMATION_REQUIRED`). Chạy lại với `--yes`.

`--yes` chỉ chấp thuận lệnh mà nó được viết kèm. API vẫn kiểm tra quyền của key.

```bash
tose deployment rollback dep_abc123          # thoát mã 4, không gửi gì
tose deployment rollback dep_abc123 --yes
```

Triển khai đích đã thất bại, đang chạy dở hoặc không tồn tại sẽ bị từ chối.

::: tip Agent
Rollback cũng có qua connector MCP, nơi nó cần bạn duyệt trong trình duyệt. Xem [Agent access](/vi/mcp/agent-access).
:::

## Lệnh liên quan

- [`tose deploy`](/commands/deploy) - Bắt đầu triển khai
- [`tose status`](/vi/commands/status) - Tìm ID triển khai
- [`tose skills install safe-rollback`](/vi/commands/skills) - Dạy agent quy trình rollback an toàn
