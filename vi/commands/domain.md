# tose domain

Quản lý tên miền tùy chỉnh cho dự án của bạn. Xem thêm [Tên miền tùy chỉnh và xác minh quyền sở hữu](/vi/guide/custom-domains).

Mọi lệnh đều nhận các tùy chọn toàn cục (xem [Tổng quan](/vi/commands/overview)), bao gồm `--json`.

## tose domain list

Liệt kê các tên miền của dự án.

```bash
tose domain list [project]
```

Bảng có các cột `DOMAIN`, `DNS`, `SSL` và `VERIFICATION` (`verified` hoặc `pending_verification`), cùng cột mặc định. Tên miền còn `pending_verification` chưa được định tuyến: hãy chạy [`tose domain verify`](#tose-domain-verify).

---

## tose domain add

Thêm tên miền tùy chỉnh vào dự án.

```bash
tose domain add <domain>
```

Tên miền mới chỉ là một yêu cầu sở hữu cho đến khi bạn chứng minh mình kiểm soát DNS của nó. Lệnh in hai bản ghi cần đặt tại nhà cung cấp DNS:

1. Bản ghi **TXT** tại `_tose-challenge.<domain>` với giá trị là token được hiển thị.
2. Bản ghi **A** của tên miền, trỏ tới `target_ip` được hiển thị.

Sau đó chạy [`tose domain verify`](#tose-domain-verify). Trước khi xác minh, tên miền không được định tuyến và không có chứng chỉ.

Thêm có thể thất bại với `DOMAIN_TAKEN` (409, chủ sở hữu khác đã xác minh hostname này) hoặc `DOMAIN_RESERVED` (400, máy chủ nền tảng như `*.tose.sh`, `localhost` và địa chỉ IP).

Với `--json`, kết quả có `verification_status: "pending_verification"`, `verification_record` cần đặt và `target_ip` cho bản ghi A.

---

## tose domain verify

Kiểm tra bản ghi TXT xác minh quyền sở hữu, định tuyến tên miền và làm mới trạng thái DNS và SSL.

```bash
tose domain verify <domain>
```

Lệnh tra cứu bản ghi TXT tại `_tose-challenge.<domain>` (hết hạn sau 5 giây). Khi bản ghi chứa token, tên miền chuyển sang `verified`, được định tuyến và chứng chỉ được yêu cầu. **Chạy lại** lệnh để kiểm tra chứng chỉ còn đang được cấp: SSL chỉ active khi chứng chỉ ở trạng thái Ready.

| Mã | HTTP | Ý nghĩa |
|----|------|---------|
| `DOMAIN_VERIFICATION_FAILED` | 422 | Bản ghi TXT bị thiếu hoặc có giá trị khác. Bản ghi cần đặt được in lại. DNS có thể mất thời gian để lan truyền, hãy thử lại sau. |
| `DOMAIN_DNS_LOOKUP_FAILED` | 422 | Chính việc tra cứu DNS thất bại. Lỗi tạm thời, thử lại an toàn. |
| `DOMAIN_TAKEN` | 409 | Chủ sở hữu khác đã xác minh hostname này. |
| `DOMAIN_RESERVED` | 400 | Hostname là máy chủ nền tảng, `localhost`, địa chỉ IP hoặc tên không công khai. |

`DOMAIN_VERIFICATION_FAILED` và `DOMAIN_DNS_LOOKUP_FAILED` đều thoát với mã `2`. Với `--json`, bản ghi cần đặt nằm trong `error.details.verification_record`.

::: info
CLI chỉ quản lý tên miền của dự án. Tên miền của ứng dụng đã cài (template) chưa được CLI quản lý; hãy dùng dashboard hoặc API.
:::

---

## tose domain rm

Xóa một tên miền tùy chỉnh.

```bash
tose domain rm <domain> [-y]
```

Lệnh hỏi xác nhận; thêm `--yes` (`-y`) để bỏ qua trong script.

## Lệnh liên quan

- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái dự án
