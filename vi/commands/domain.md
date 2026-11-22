# tose domain

Quản lý tên miền tùy chỉnh của dự án.

## tose domain list

Liệt kê mọi tên miền đã cấu hình cho dự án.

### Cú pháp

```bash
tose domain list [project]
```

### Cách dùng

```bash
$ tose domain list

DOMAIN                                   DNS        SSL        VERIFICATION           DEFAULT
example.com                              active     active     verified               yes
www.example.com                          active     active     verified
api.example.com                          pending    pending    pending_verification
```

### Đầu ra JSON

```bash
$ tose domain list --json
```

```json
{
  "success": true,
  "data": [
    {
      "id": "dom_abc123",
      "domain": "example.com",
      "dns_status": "active",
      "ssl_status": "active",
      "is_default": true
    },
    {
      "id": "dom_def456",
      "domain": "www.example.com",
      "dns_status": "active",
      "ssl_status": "active",
      "is_default": false
    }
  ]
}
```

---

## tose domain add

Thêm tên miền tùy chỉnh cho dự án.

### Cú pháp

```bash
tose domain add <domain>
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `<domain>` | Tên miền cần thêm (ví dụ `example.com`) |

### Cách dùng

Trỏ tên miền về TOSE trước hoặc sau khi thêm đều được. Nếu khi thêm nó đã phân giải tới `target_ip` của nó, tên miền được xác minh, định tuyến và cấp chứng chỉ ngay:

```bash
$ tose domain add example.com

✓ Domain example.com added
  DNS Status: active
  SSL Status: pending
  Verification: verified
```

Nếu chưa, nó ở trạng thái `pending_verification`, và lệnh in ra bản ghi A cần tạo:

```bash
$ tose domain add example.com

✓ Domain example.com added
  DNS Status: pending
  SSL Status: pending
  Verification: pending_verification

  Point the domain at TOSE:
    A    example.com  ->  <target_ip>
  The domain is not routed until it is verified. Then run: tose domain verify example.com
```

### Sau khi thêm tên miền

Tại nhà cung cấp DNS, trỏ tên miền tới `target_ip` hiển thị cho nó:

```
Type:  A
Name:  example.com (hoặc tên miền con)
Value: <target_ip hiển thị cho tên miền>
```

CNAME có chuỗi phân giải về `target_ip` cũng dùng được. `target_ip` được `tose domain add` in ra, hiển thị trong hộp thoại Add Custom Domain của dashboard và trong phản hồi API của tên miền. Đây là địa chỉ ingress của môi trường phục vụ dự án: với dự án phát triển, đó là địa chỉ của máy chủ phát triển chứ không phải của production. Mỗi hostname là một tên miền riêng, nên hãy thêm `example.com` và `www.example.com` riêng rẽ.

Sau đó chạy `tose domain verify <domain>`. Không cần bản ghi TXT. Cho đến khi được xác minh, tên miền không được định tuyến và không có chứng chỉ. Tên miền đứng sau DNS proxy, không thể phân giải tới `target_ip`, có thể được xác minh bằng bản ghi TXT trong `verification_record` thay thế (xem `tose domain add --json`). Xem [Tên miền tùy chỉnh và xác minh](/vi/guide/custom-domains).

Khi gỡ tên miền khỏi TOSE, hãy gỡ luôn bản ghi DNS của nó: hostname trỏ về TOSE mà chưa có chủ sở hữu đã xác minh có thể bị bất kỳ workspace nào chiếm, các tên dưới một bản ghi wildcard trỏ về TOSE cũng vậy. Xem [Gỡ bản ghi DNS bạn không còn dùng](/vi/guide/custom-domains#remove-dns-records).

Khi tên miền đã được xác minh, `dns_status` là `active` và chứng chỉ SSL được cấp. SSL chỉ hiển thị active khi chứng chỉ đã Ready.

### Đầu ra JSON

```json
{
  "success": true,
  "data": {
    "id": "dom_abc123",
    "domain": "example.com",
    "dns_status": "pending",
    "ssl_status": "pending",
    "is_default": false,
    "target_ip": "203.0.113.10",
    "verification_status": "pending_verification",
    "verification_record": {
      "type": "TXT",
      "name": "_tose-challenge.example.com",
      "value": "<token>"
    }
  }
}
```

`verification_record` chỉ có khi tên miền đang chờ, và chỉ cần cho tên miền không thể phân giải tới `target_ip`.

---

## tose domain verify

Xác minh tên miền tùy chỉnh đang chờ và làm mới trạng thái DNS, SSL của tên miền đã xác minh.

### Cú pháp

```bash
tose domain verify <domain>
```

### Cách dùng

TOSE kiểm tra tên miền có phân giải tới `target_ip` của nó không (bản ghi A hoặc AAAA, hay chuỗi CNAME). Nếu có, tên miền được xác minh, định tuyến và chứng chỉ được yêu cầu:

```bash
$ tose domain verify example.com

✓ Domain example.com verified
  Verification: verified
  DNS Status: active
  SSL Status: pending
  The certificate is still being issued. Run again to check: tose domain verify example.com
```

Nếu không, API trả `422 DOMAIN_VERIFICATION_FAILED`, và lệnh in thông báo của nó, nêu hiện tên miền phân giải tới đâu và cần trỏ về đâu, kèm `target_ip` và các địa chỉ trong `resolved`. Sửa bản ghi DNS, chờ nó lan truyền, rồi chạy lại lệnh. Chạy lại sau trên tên miền đã xác minh để biết khi nào SSL chuyển sang active.

---

## tose domain rm

Gỡ một tên miền tùy chỉnh.

### Cú pháp

```bash
tose domain rm <domain> [-y]
```

### Tham số

| Tham số | Mô tả |
|---------|-------|
| `<domain>` | Tên miền cần gỡ |

### Tùy chọn

| Tùy chọn | Viết tắt | Mô tả |
|----------|----------|-------|
| `--yes` | `-y` | Bỏ qua bước xác nhận |

### Cách dùng

```bash
$ tose domain rm example.com

Remove domain example.com? Yes
✓ Removing domain example.com...
✓ Domain example.com removed
```

**Bỏ qua xác nhận:**

```bash
$ tose domain rm example.com -y

✓ Removing domain example.com...
✓ Domain example.com removed
```

::: warning
Gỡ tên miền không thay đổi DNS của bạn. Hãy xóa luôn bản ghi A hoặc CNAME của nó tại nhà cung cấp DNS, nếu không workspace khác có thể thêm và xác minh hostname đó khi nó vẫn trỏ về TOSE.
:::

### Đầu ra JSON

```json
{
  "success": true,
  "data": {
    "removed": "example.com"
  }
}
```

## Bảng trạng thái tên miền

### Trạng thái DNS

| Trạng thái | Mô tả |
|------------|-------|
| `active` | Tên miền phân giải tới `target_ip` của nó |
| `pending` | Đang chờ DNS trỏ tới `target_ip` |

### Trạng thái SSL

| Trạng thái | Mô tả |
|------------|-------|
| `active` | Chứng chỉ SSL đã Ready |
| `pending` | Chứng chỉ đang được cấp |

### Trạng thái xác minh

| Trạng thái | Mô tả |
|------------|-------|
| `verified` | Tên miền trỏ tới `target_ip` (hoặc đã tìm thấy bản ghi TXT của nó); nó được định tuyến |
| `pending_verification` | Chưa được định tuyến; trỏ tên miền tới `target_ip`, rồi chạy `tose domain verify` |

::: tip
DNS có thể mất tới 48 giờ để lan truyền, nhưng thường chỉ vài phút. Chứng chỉ SSL được cấp tự động khi tên miền đã được xác minh.
:::

## Lệnh liên quan

- [`tose open`](/commands/open) (tiếng Anh) - Mở URL dự án (dùng tên miền mặc định)
- [`tose status`](/vi/commands/status) - Kiểm tra trạng thái dự án
