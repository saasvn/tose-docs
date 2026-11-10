# Tên miền tùy chỉnh và xác minh quyền sở hữu

Tên miền tùy chỉnh chỉ được định tuyến sau khi bạn chứng minh mình kiểm soát DNS của nó. Ngoại lệ duy nhất là tên miền nằm một cấp dưới tên miền gốc của môi trường phát triển của workspace: DNS đó thuộc về môi trường, nên nó được xác minh ngay khi tạo. Trang này giải thích cách chứng minh, các trạng thái bạn sẽ thấy và những gì TOSE từ chối. Quy tắc áp dụng cho tên miền của dự án và của ứng dụng đã cài (template).

## Cách xác minh hoạt động

1. **Thêm tên miền** trong dashboard, bằng `tose domain add`, hoặc bằng `POST /api/workspaces/{slug}/projects/{project_slug}/domains` (`POST .../templates/{template_slug}/domains` cho ứng dụng). Chỉ owner hoặc admin mới thêm được.
2. TOSE ghi một yêu cầu sở hữu với `verification_status: pending_verification` và trả về `verification_record`: một token ngẫu nhiên và tên cần đặt nó.
3. **Thêm bản ghi TXT** tại `_tose-challenge.<tên-miền-của-bạn>` với giá trị là token được hiển thị. Đồng thời trỏ bản ghi A tới `target_ip` được hiển thị.
4. **Bấm Xác minh**, hoặc gọi `POST .../domains/{domain_id}/verify`. TOSE tra cứu bản ghi TXT (hết hạn sau 5 giây). Khi bản ghi chứa token, tên miền chuyển sang `verified`, được định tuyến và chứng chỉ được yêu cầu.

```bash
curl -X POST https://api.tose.sh/api/workspaces/my-team/projects/my-site/domains/$DOMAIN_ID/verify \
  -H "X-API-Key: $TOSE_API_KEY"
```

Tên miền đang chờ **không được định tuyến và không có chứng chỉ**. Xác minh có thể thất bại với:

| Trạng thái và mã | Ý nghĩa |
|------------------|---------|
| `422 DOMAIN_VERIFICATION_FAILED` | Bản ghi TXT bị thiếu hoặc có giá trị khác. Phản hồi nhắc lại `verification_record` cần đặt. DNS có thể mất thời gian để lan truyền, hãy thử lại sau. |
| `422 DOMAIN_DNS_LOOKUP_FAILED` | Chính việc tra cứu DNS thất bại. Hãy thử lại. |
| `409 DOMAIN_TAKEN` | Chủ sở hữu khác đã xác minh hostname này. |

## Mỗi hostname một chủ sở hữu

Một hostname có tối đa một chủ sở hữu đã xác minh trên **mọi workspace**, tính chung cho dự án và ứng dụng. Yêu cầu đang chờ không chặn ai, nên không ai giữ được tên miền mà không kiểm soát DNS của nó: yêu cầu nào xác minh trước sẽ thắng, yêu cầu sau nhận `409 DOMAIN_TAKEN`. Thêm tên miền đã có trên cùng dự án trả về `409 DOMAIN_ALREADY_ADDED`.

## Những gì không thể thêm

TOSE từ chối với `400 DOMAIN_RESERVED`:

- máy chủ của nền tảng và tên miền con của chúng, như `*.tose.sh`;
- `localhost`, địa chỉ IP và tên không công khai (`.local`, `.internal` và tương tự).

Tên không phải hostname hợp lệ trả về `400 DOMAIN_INVALID`. Tên được cắt khoảng trắng, chuyển chữ thường, bỏ dấu chấm cuối và đổi sang punycode trước, nên hãy nhập hostname thuần, không kèm scheme, cổng, đường dẫn hay ký tự đại diện.

## Các trạng thái

| Trường | Giá trị và ý nghĩa |
|--------|--------------------|
| `verification_status` | `pending_verification` cho đến khi bản ghi TXT được kiểm tra, sau đó là `verified`. |
| `dns_status` | `active` khi tên miền trỏ tới `target_ip`. |
| `ssl_status` | `active` chỉ khi chứng chỉ đã **Ready**. Gọi verify lần nữa để kiểm tra chứng chỉ đang chờ. |

## Tên miền bạn đã thêm trước đây

Tên miền gắn trước khi có cơ chế xác minh được đánh dấu `verified`, nên các site đang chạy vẫn hoạt động mà không cần bản ghi TXT. Nếu cùng một hostname được gắn cho cả dự án và ứng dụng, yêu cầu cũ nhất giữ `verified` và yêu cầu còn lại chuyển sang `pending_verification` với token mới.

Xem thêm [`tose domain`](/commands/domain), [Projects API](/vi/api/projects) và [hợp đồng OpenAPI](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
