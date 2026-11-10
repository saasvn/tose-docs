# tose deploy / redeploy

Kích hoạt triển khai cho dự án của bạn.

## tose deploy

Triển khai dự án đã liên kết.

### Tóm tắt

```bash
tose deploy [project]
```

### Mô tả

Tạo một deployment mới cho dự án. Khác với [`tose up`](/vi/commands/up), lệnh này không tự `init`, không kết nối Git và không đẩy biến môi trường. Nó chỉ kích hoạt deployment bằng cấu hình hiện có.

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `[project]` | Tùy chọn. Slug dự án hoặc dạng `workspace/project` |

### Sử dụng

```bash
$ tose deploy

✓ Deploying my-workspace/my-app...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  Commit: a1b2c3d

Stream build logs with: tose logs --build -f
```

### Đầu ra JSON

```bash
$ tose deploy --json
```

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "pending",
    "git_commit_sha": "a1b2c3d4e5f6...",
    "git_commit_message": "feat: add new feature"
  }
}
```

### Lỗi: chưa kết nối Git

```bash
$ tose deploy

Error: Project has no git connection.
Run 'tose up' to connect your repository first.
```

### Lỗi: số dư ví không đủ

Khi số dư ví của workspace bằng 0 hoặc âm, API từ chối `deploy`, `redeploy` và `rollback` với mã `402` và code `INSUFFICIENT_BALANCE`. Không có deployment nào được tạo. CLI thoát với mã `9`.

```bash
$ tose deploy

Error: insufficient wallet balance
```

Với `--json`, `error.code` là `INSUFFICIENT_BALANCE` và `next_actions` chứa trang nạp tiền trong trường `url`, và lệnh cần chạy lại sau khi ví có tiền:

```json
{
  "schema_version": "1",
  "status": "error",
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "insufficient wallet balance"
  },
  "next_actions": [
    {
      "command": "tose deploy",
      "description": "Top up the workspace wallet at https://tose.sh/w/my-workspace/billing, then retry",
      "url": "https://tose.sh/w/my-workspace/billing"
    }
  ]
}
```

Deployment được xếp hàng do push lên GitHub không bị từ chối ngay. Build pipeline đánh dấu nó `failed` với `error_message` bắt đầu bằng `insufficient wallet balance` (hoặc `no wallet found`). `tose deploy --wait` và `tose deployment wait <id>` nhận diện lỗi này, thoát với mã `9` thay vì `8` và in cùng gợi ý nạp tiền. Xem [Thanh toán](/vi/guide/pricing) để hiểu cách ví hoạt động.

### Chẩn đoán bằng `tose doctor`

```bash
tose doctor [workspace/project] --json
```

`tose doctor` kiểm tra phiên bản Node, API key, dự án, tích hợp Git, server và cổng, quota, deployment mới nhất, tình trạng pod và DNS/SSL của domain tùy chỉnh. Khi deployment mới nhất thất bại vì số dư ví, bước kiểm tra deployment báo `fail` kèm gợi ý nạp tiền, `next_actions` có `url` trang thanh toán, và lệnh thoát với mã `1` (`CHECKS_FAILED`).

---

## tose redeploy

Triển khai lại với cấu hình hiện tại mà không build lại Docker image.

### Tóm tắt

```bash
tose redeploy [project]
```

### Mô tả

Triển khai lại dự án bằng Docker image và cấu hình hiện có. Nhanh hơn deploy đầy đủ vì bỏ qua bước build. Hữu ích khi bạn chỉ đổi biến môi trường hoặc cấu hình server.

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `[project]` | Tùy chọn. Slug dự án hoặc dạng `workspace/project` |

### Sử dụng

```bash
$ tose redeploy

✓ Redeploying my-workspace/my-app...
✓ Redeploy complete
  Deployment ID: dep_xyz789
  Status: deploying
  URL: https://my-app.tose.sh
```

### Lỗi: số dư ví không đủ

`tose redeploy` và `tose rollback` bị từ chối giống `tose deploy`: mã thoát `9`, `error.code: "INSUFFICIENT_BALANCE"` và một mục `next_actions` có `url` nạp tiền. Hãy nạp ví rồi chạy lại lệnh.

### Lỗi: redeploy hoặc rollback thất bại

Nếu redeploy thất bại, ở cụm hoặc ở một bước trước đó như đọc server, secret hoặc ổ đĩa, API trả `500` kèm `Redeploy failed. See the server log for details.`. Message chung chung có chủ đích: lỗi của cụm có thể chứa chi tiết hạ tầng nên chỉ nằm trong log của server. Hãy chạy lại lệnh, và gửi `request_id` cho bộ phận hỗ trợ nếu vẫn lỗi.

`tose rollback` chạy qua một runbook khôi phục. Với API key, API lưu kế hoạch và trả `409 APPROVAL_REQUIRED` kèm `approval_url`: owner hoặc admin của workspace mở link đó khi đã đăng nhập và phê duyệt kế hoạch, sau đó chạy kế hoạch bằng `tose runbook execute <plan_id>`. Lần chạy thất bại trả `409` với mã của lần chạy (`RUNBOOK_FAILED`, hoặc mã của bước bị lỗi, ví dụ `PLAN_STALE`) và kế hoạch trong `runbook`. Xem [`ROLLBACK_FAILED`](/vi/api/errors#ROLLBACK_FAILED).

## deploy so với redeploy

| Tính năng | `tose deploy` | `tose redeploy` |
|-----------|---------------|-----------------|
| Build image mới | Có | Không |
| Dùng code mới nhất | Có (commit mới nhất) | Không (image hiện có) |
| Tốc độ | Chậm hơn (build + deploy) | Nhanh hơn (chỉ deploy) |
| Trường hợp dùng | Đổi code | Đổi cấu hình/env |

## Lệnh liên quan

- [`tose up`](/vi/commands/up) - Triển khai thông minh đầy đủ
- [`tose down`](/vi/commands/down) - Dừng deployment
- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái
- [`tose logs`](/vi/commands/logs) - Xem logs
- [Mã thoát](/vi/commands/overview#exit-codes) - Ý nghĩa của mã `9`
