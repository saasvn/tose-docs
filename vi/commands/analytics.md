# tose analytics

Số liệu phân tích chỉ đọc cho một workspace: chi phí, tài nguyên và độ tin cậy. `tose analytics` gọi API analytics của workspace (`GET /api/workspaces/{slug}/analytics/{view}`); lệnh không bao giờ ghi dữ liệu, không phát cảnh báo và không thay đổi việc tính phí. Định nghĩa các chỉ số nằm trong tài liệu [workspace analytics](https://github.com/saasvn/tose-app/blob/master/docs/analytics.md).

::: info Bản CLI tiếp theo
`tose analytics` có trong bản CLI phát hành tiếp theo, sau [saasvn/tose-cli#108](https://github.com/saasvn/tose-cli/pull/108). Các bản CLI cũ hơn không có lệnh này.
:::

| Lệnh | Hiển thị | Scope của key |
|------|----------|---------------|
| `tose analytics overview` | Chi phí, tài nguyên và độ tin cậy trong một lần đọc | `workspace:read` |
| `tose analytics costs` | Chi tiêu đã đo, tài nguyên tốn nhất, số dư trả trước và dự báo | `billing:read` |
| `tose analytics resources` | CPU/RAM được cấp cho từng workload và bộ nhớ quan sát được | `projects:read` |
| `tose analytics reliability` | Sự cố, bằng chứng uptime và kết quả triển khai | `deployments:read` |

```bash
tose analytics overview                 # 24 giờ qua
tose analytics costs --window 7d
tose analytics resources --window 30d
tose analytics reliability --json
```

Mọi view nhận `--window 24h|7d|30d`, tính đến hiện tại (mặc định `24h`). Giá trị khác bị từ chối trước khi gửi request, với mã thoát `2`. Workspace được xác định như các lệnh khác, ví dụ qua `--workspace <slug>`.

## Công tắc phía máy chủ

Máy chủ tắt analytics trừ khi đặt `ANALYTICS_ENABLED`. Khi đang tắt, mọi view đều lỗi `NOT_FOUND` (mã thoát `6`), giống như khi tài khoản của bạn không còn là thành viên của workspace. Một workspace khác với workspace của API key sẽ lỗi `API_KEY_WORKSPACE_SCOPED` (mã thoát `3`). Key thiếu scope của view vẫn nhận `INSUFFICIENT_SCOPE`, vì kiểm tra quyền chạy trước.

## Scope

- `overview` chỉ cần `workspace:read`. Phần nào key không được đọc hiện là `forbidden`, phần nào không đọc được nguồn dữ liệu hiện là `unavailable`. Cả hai đều không kèm số liệu, nên một scope không bao giờ để lộ khu vực khác.
- `costs`, `resources` và `reliability` lỗi `INSUFFICIENT_SCOPE` (mã thoát `3`) khi key thiếu scope tương ứng, và nêu scope còn thiếu trong `details.required_scope`.

## Đọc số liệu

- `null` nghĩa là chưa biết, không bao giờ là 0. Chế độ văn bản in là `unknown`.
- Chi phí tính bằng nano-USD (1 USD = 1.000.000.000).
- CPU và RAM được cấp là cấu hình, không phải mức dùng. Bộ nhớ quan sát được lấy từ một pod cho mỗi workload, nên chỉ mô tả một replica. Mức dùng CPU không được thu thập.
- Uptime là lần kiểm tra gần nhất của monitor mỗi dự án. `stale`, `unknown` và `not_monitored` không bao giờ được tính là up, và không có tỉ lệ uptime vì lịch sử kiểm tra không được lưu.
- Số phút CI không có ở đây: dùng [`tose ci usage`](/vi/commands/ci).

## Đầu ra JSON

`--json` đặt nguyên câu trả lời của API vào `data`, gồm cả `meta`: `complete`, `coverage`, `granularity`, `units` và `notes`, cạnh khoảng thời gian (`window`, `from`, `to`). `complete` là `false` khi một bucket đã đóng không có dữ liệu hoặc bằng chứng uptime đã cũ, nên hãy kiểm tra trường này trước khi tin một con số tổng.

```bash
tose analytics costs --window 7d --json
```
