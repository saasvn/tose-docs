# Tên miền tùy chỉnh và xác minh

Tên miền tùy chỉnh chỉ được định tuyến khi DNS của nó trỏ về TOSE. Bạn trỏ tên miền tới `target_ip` hiển thị cho nó, tức địa chỉ ingress của môi trường phục vụ tên miền, và TOSE xác minh tên miền khi nó phân giải tới địa chỉ đó. Không cần bản ghi TXT. Cách này giống nhau cho dự án và ứng dụng đã cài (template), trên production lẫn môi trường phát triển; với dự án phát triển, `target_ip` là địa chỉ máy chủ phát triển của nó, nên tên miền được định tuyến trên môi trường mà nó trỏ tới. Ngoại lệ duy nhất là tên miền nằm một cấp dưới tên miền gốc của môi trường phát triển của workspace: DNS đó thuộc về môi trường, nên nó được xác minh ngay khi tạo. Trang này giải thích các bước, các trạng thái bạn sẽ thấy và những gì TOSE từ chối.

## Cách xác minh hoạt động

1. **Thêm tên miền** trong dashboard, bằng `tose domain add`, hoặc bằng `POST /api/workspaces/{slug}/projects/{project_slug}/domains` (`POST .../templates/{template_slug}/domains` cho ứng dụng). Chỉ owner hoặc admin mới thêm được. Mỗi hostname là một tên miền riêng: thêm `example.com` và `www.example.com` riêng rẽ.
2. **Trỏ tên miền tới `target_ip`** tại nhà cung cấp DNS: bản ghi A cho hostname, hoặc CNAME có chuỗi phân giải về địa chỉ đó. `target_ip` có trong phản hồi, trong kết quả của `tose domain add` và trong hộp thoại Add Custom Domain của dashboard.
3. **Bấm Xác minh**, hoặc gọi `POST .../domains/{domain_id}/verify`. TOSE tra cứu hostname (hết hạn sau 5 giây). Khi nó phân giải tới `target_ip` qua bản ghi A hoặc AAAA hay chuỗi CNAME, tên miền chuyển sang `verified`, được định tuyến và chứng chỉ được yêu cầu.

Nếu tên miền đã trỏ tới `target_ip` khi bạn thêm, phản hồi của lệnh thêm đã là `verified` và tên miền được định tuyến, cấp chứng chỉ ngay, nên bạn có thể bỏ qua bước 3. Nếu chưa, nó bắt đầu ở `pending_verification`.

```bash
curl -X POST https://api.tose.sh/api/workspaces/my-team/projects/my-site/domains/$DOMAIN_ID/verify \
  -H "X-API-Key: $TOSE_API_KEY"
```

Tên miền đang chờ **không được định tuyến và không có chứng chỉ**. Xác minh có thể thất bại với:

| Trạng thái và mã | Ý nghĩa |
|------------------|---------|
| `422 DOMAIN_VERIFICATION_FAILED` | Tên miền không phân giải tới `target_ip`. Thông báo nêu hiện nó phân giải tới đâu và cần trỏ về đâu; phản hồi còn kèm `target_ip` và `resolved`, danh sách địa chỉ TOSE tìm thấy (rỗng khi chưa có bản ghi). DNS có thể mất thời gian để lan truyền, hãy thử lại sau. |
| `409 DOMAIN_TAKEN` | Chủ sở hữu khác đã xác minh hostname này. |

```json
{
  "error": "shop.example.com resolves to 198.51.100.7. Point an A record (or a CNAME that resolves there) at 203.0.113.10, wait for DNS to propagate, then verify again.",
  "code": "DOMAIN_VERIFICATION_FAILED",
  "target_ip": "203.0.113.10",
  "resolved": ["198.51.100.7"],
  "verification_record": { "type": "TXT", "name": "_tose-challenge.shop.example.com", "value": "<token>" }
}
```

### Bản ghi TXT cho DNS qua proxy {#txt-record}

Tên miền không thể phân giải tới `target_ip`, chẳng hạn tên miền đứng sau một DNS proxy như chế độ đám mây cam của Cloudflare, có thể được xác minh bằng bản ghi TXT thay thế. Tên miền đang chờ mang `verification_record` trong API (phản hồi liệt kê, thêm và verify thất bại): đặt bản ghi TXT tại `_tose-challenge.<tên-miền-của-bạn>` với giá trị là token được hiển thị, rồi xác minh. Dashboard không còn hiển thị bản ghi này; hãy đọc nó từ API hoặc kết quả `--json` của CLI. Verify chấp nhận một trong hai bằng chứng: tên miền phân giải tới `target_ip`, hoặc bản ghi TXT chứa token.

### Gỡ bản ghi DNS bạn không còn dùng {#remove-dns-records}

Trỏ tên miền về TOSE cho thấy người kiểm soát DNS của nó đã gửi nó tới TOSE, nhưng không cho biết họ muốn workspace nào: địa chỉ ingress được dùng chung bởi mọi workspace của một môi trường. Vì vậy hostname trỏ tới địa chỉ đó mà chưa có chủ sở hữu đã xác minh có thể được bất kỳ workspace nào thêm và xác minh. Do đó:

- khi gỡ tên miền khỏi TOSE, hãy gỡ luôn bản ghi A hoặc CNAME của nó;
- bản ghi wildcard (`*.example.com`) trỏ về TOSE cho phép bất kỳ tên nào dưới nó bị chiếm, nên hãy thêm đúng các tên bạn dùng, hoặc tránh dùng wildcard;
- thêm tên miền ngay sau khi trỏ nó. Thêm một tên miền đã trỏ về TOSE sẽ xác minh nó ngay, nên trỏ trước rồi thêm sau không để lại khoảng trống.

## Mỗi hostname một chủ sở hữu

Một hostname có tối đa một chủ sở hữu đã xác minh trên **mọi workspace**, tính chung cho dự án và ứng dụng. Yêu cầu đang chờ không chặn ai, nên không ai giữ được tên miền mà DNS của nó không trỏ về TOSE: yêu cầu nào xác minh trước sẽ thắng, yêu cầu sau nhận `409 DOMAIN_TAKEN`. Thêm tên miền đã có trên cùng dự án trả về `409 DOMAIN_ALREADY_ADDED`.

## Những gì không thể thêm

TOSE từ chối với `400 DOMAIN_RESERVED`:

- máy chủ của nền tảng và tên miền con của chúng, như `*.tose.sh`;
- `localhost`, địa chỉ IP và tên không công khai (`.local`, `.internal` và tương tự).

Trên dự án phát triển, chính tên miền gốc của môi trường phát triển và mọi tên nằm sâu hơn một cấp dưới nó bị từ chối với `400` ("Development domains must be one label below the development base domain").

Tên không phải hostname hợp lệ trả về `400 DOMAIN_INVALID`. Tên được cắt khoảng trắng, chuyển chữ thường, bỏ dấu chấm cuối và đổi sang punycode trước, nên hãy nhập hostname thuần, không kèm scheme, cổng, đường dẫn hay ký tự đại diện.

## Các trạng thái

| Trường | Giá trị và ý nghĩa |
|--------|--------------------|
| `verification_status` | `pending_verification` cho đến khi tên miền phân giải tới `target_ip` (hoặc tìm thấy bản ghi TXT của nó), sau đó là `verified`. |
| `dns_status` | `active` khi tên miền trỏ tới `target_ip`. |
| `ssl_status` | `active` chỉ khi chứng chỉ đã **Ready**. Gọi verify lần nữa để kiểm tra chứng chỉ đang chờ. |

## Chứng chỉ không bao giờ được cấp {#stuck-certificate}

Tên miền đã xác minh mà chứng chỉ vẫn chưa Ready sau 7 ngày sẽ được TOSE kiểm tra lại:

- Nếu tên miền trỏ tới địa chỉ của TOSE hoặc Cloudflare, không có gì thay đổi. Hộp thư nhận sự kiện `domain.certificate_stuck` kèm các địa chỉ TOSE thấy.
- Nếu không (không có bản ghi, hoặc trỏ tới host khác), tên miền trở về `pending_verification` với `ssl_status` là `failed`, giữ nguyên token TXT. Tên miền bị gỡ khỏi định tuyến và yêu cầu cấp chứng chỉ dừng lại. Hộp thư nhận sự kiện `domain.certificate_abandoned` nêu kết quả DNS trả về.

Trỏ DNS về TOSE rồi bấm **Verify** lại (hoặc `POST .../domains/{domain_id}/verify`); việc này định tuyến tên miền và yêu cầu chứng chỉ mới. Không dữ liệu nào bị xóa.

## Tên miền bạn đã thêm trước đây

Tên miền gắn trước khi có cơ chế xác minh được đánh dấu `verified`, nên các site đang chạy vẫn hoạt động mà không cần xác minh lại. Nếu cùng một hostname được gắn cho cả dự án và ứng dụng, yêu cầu cũ nhất giữ `verified` và yêu cầu còn lại chuyển sang `pending_verification` với token mới.

Xem thêm [`tose domain`](/vi/commands/domain), [Projects API](/vi/api/projects) và [hợp đồng OpenAPI](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
