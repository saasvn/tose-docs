# tose runbook

Lập kế hoạch, xem lại và chạy một runbook khôi phục: restart, hoặc rollback về image của một triển khai trước. Một người phải duyệt từng kế hoạch trong trình duyệt trước khi nó được chạy.

`tose runbook` dùng luồng plan, approve, execute của API. [`tose restart`](/vi/commands/down) và [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback) vẫn hoạt động như cũ.

| Lệnh | Tác dụng | Có thay đổi gì không? |
|------|----------|-----------------------|
| `tose runbook plan restart [project]` | Kế hoạch chỉ đọc cho workload đang chạy | Không |
| `tose runbook plan rollback <deployment_id> [project]` | Lập kế hoạch quay về image của một triển khai trước | Không |
| `tose runbook list [project] [--limit <n>]` | Các kế hoạch gần đây và trạng thái (`--limit` từ 1 đến 50) | Không |
| `tose runbook show <plan_id> [project]` | Một kế hoạch, trạng thái và bước tiếp theo | Không |
| `tose runbook execute <plan_id> [project]` | Chạy một kế hoạch đã duyệt, đúng một lần | Có |

## Luồng thực hiện

```bash
$ tose runbook plan rollback dep_abc123      # 1. Lập kế hoạch (chưa thay đổi gì)
# 2. Owner hoặc admin đã đăng nhập mở approval_url và duyệt đúng kế hoạch đó
$ tose runbook execute <plan_id> --wait      # 3. Chạy một lần và chờ kết quả đã xác minh
```

## Duyệt là bước của con người

Owner hoặc admin đã đăng nhập duyệt đúng kế hoạch trong trình duyệt qua `approval_url` trong kết quả. CLI và API key không thể duyệt.

Chạy `execute` với kế hoạch chưa duyệt sẽ không gửi gì và thoát với mã `4` (`HUMAN_APPROVAL_REQUIRED`). Lỗi kèm theo `approval_url`.

## Trạng thái kế hoạch

| Trạng thái | Ý nghĩa |
|------------|---------|
| `awaiting_approval` | Đang chờ người duyệt trong trình duyệt |
| `approved` | Đã duyệt, chưa chạy |
| `expired` | Kế hoạch hết hạn 30 phút trước khi chạy |
| `rejected` | Người duyệt đã từ chối. Không bao giờ chạy |
| `pending_verification` | Đã áp dụng, nhưng cluster chưa xác nhận rollout |
| `completed` | Đã áp dụng và xác minh: mọi replica đều sẵn sàng |
| `failed` | Đã áp dụng, nhưng xác minh thất bại |

## Kế hoạch cũ (stale)

Kế hoạch sống 30 phút và gắn với image, replicas, triển khai và ổ đĩa đang chạy. Nếu hết hạn, `execute` lỗi `PLAN_STALE`. Nếu đích đã đổi, API cũng từ chối bằng `PLAN_STALE`. Kế hoạch bị từ chối lỗi `PLAN_CLOSED`. Tất cả đều không thay đổi gì. Hãy lập kế hoạch mới; thông báo lỗi gợi ý sẵn lệnh.

## tose runbook execute

```bash
tose runbook execute <plan_id> [project] [--wait] [--timeout <duration>] [--idempotency-key <key>]
```

| Tùy chọn | Mô tả |
|----------|-------|
| `--wait` | Chờ đến khi cluster xác minh rollout |
| `--timeout <duration>` | `--wait` được chờ bao lâu, ví dụ `90s` hoặc `5m`. Mặc định `5m` |
| `--idempotency-key <key>` | Ghi đè key (8 đến 128 ký tự) |

### Một idempotency key cho mỗi kế hoạch

`execute` gửi một key cho mỗi kế hoạch, `cli-runbook-<plan_id>` trừ khi bạn truyền `--idempotency-key`, ở mọi lần thử lại và chạy lại. Một kế hoạch được áp dụng tối đa một lần: lần lặp lại trả về kết quả của lần chạy đầu và báo là đã chạy. Lỗi mạng và phản hồi `502`, `503`, `504` được thử lại với cùng key.

### Chờ xác minh

Nếu cluster chưa xác nhận rollout, kết quả ở trạng thái `pending_verification`. Với `--wait`, CLI tiếp tục thăm dò và thoát với mã `7` (`TIMEOUT`) khi hết `--timeout`. Kế hoạch vẫn đã được áp dụng đúng một lần và không bao giờ áp dụng lại. Kiểm tra sau bằng `tose runbook show <plan_id>`.

Runbook xác minh thất bại thoát với mã `8` (`OPERATION_FAILED`).

### Biên nhận rollback

Với rollback, `receipt` (triển khai mang biên nhận) chỉ xuất hiện sau khi rollout được xác minh. Trước đó, và sau khi thất bại, nó là `null`.

## Lệnh liên quan

- [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback) - Rollback trực tiếp với `--yes`
- [`tose restart`](/vi/commands/down) - Restart trực tiếp
- [`tose status`](/vi/commands/status) - Tìm ID triển khai và kiểm tra sức khỏe
