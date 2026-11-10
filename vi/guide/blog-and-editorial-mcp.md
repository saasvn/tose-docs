# Đăng blog qua MCP

Quản trị viên nền tảng có thể viết và xuất bản blog công khai của TOSE từ một MCP client, qua chín công cụ `blog_*` trên cùng server MCP với phần deployment. Người đọc xem bài đã xuất bản qua API đọc công khai, không cần đăng nhập.

::: warning Tắt cho đến khi vận hành bật
Công cụ blog và các route công khai chỉ tồn tại trên instance TOSE mà người vận hành đã đặt `BLOG_ENABLED=true`. Mặc định tính năng này tắt. Đừng hiểu hướng dẫn này là blog đã chạy ở production cho đến khi vận hành xác nhận. Nếu không thấy các công cụ trong `tools/list`, instance đó chưa bật blog hoặc token của bạn thiếu scope.
:::

## Ai dùng được

- **Scope:** `blog:write`. Đây không phải scope của API key, nên chỉ kết nối OAuth mới giữ được.
- **Chỉ quản trị viên nền tảng.** Màn hình đồng ý chỉ hiện ô chọn blog cho quản trị viên nền tảng. Với người khác, scope bị bỏ, và yêu cầu giả mạo scope này bị từ chối. Owner của workspace là chưa đủ, vì blog thuộc về toàn nền tảng.
- **Kiểm tra ở mỗi lệnh gọi.** Người dùng thường nhận `403`, và admin bị hạ quyền nhận `FORBIDDEN` ngay. Lần refresh token sau sẽ mất scope.
- **Ẩn khi thiếu scope.** Công cụ blog không xuất hiện trong `tools/list` với token không có `blog:write`; nếu vẫn gọi, client nhận [bước nâng quyền `insufficient_scope`]X.

Mỗi lệnh gọi được ghi vào nhật ký audit của MCP cùng kết quả.

## Công cụ

| Công cụ | Chức năng | Có thay đổi dữ liệu? |
|---------|-----------|----------------------|
| `blog_list` | Liệt kê bài ở mọi trạng thái (nháp hoặc đã xuất bản), mới thay đổi trước, không kèm nội dung. | Không |
| `blog_get` | Đọc một bài với toàn bộ block, theo id hoặc theo slug và locale. | Không |
| `blog_create_draft` | Tạo bản nháp. Chưa có gì công khai cho đến khi publish. | Có |
| `blog_update_draft` | Sửa các trường của bản nháp; trường bỏ qua giữ nguyên. Không đổi được slug và locale. | Có |
| `blog_validate` | Trả mọi lỗi và cảnh báo kèm JSON path, cùng thời gian đọc. Nhận các trường của `blog_create_draft` để kiểm tra trước khi lưu, hoặc id/slug của bài đã lưu. | Không |
| `blog_preview` | Tạo liên kết xem trước riêng tư cho bài. | Có |
| `blog_publish` | Xuất bản bản nháp theo hai bước (xem bên dưới). | **Có**, lên công khai |
| `blog_unpublish` | Gỡ bài khỏi website và đưa về nháp. Cần `confirm: true`. | **Có**, tác động công khai |
| `blog_upload_media` | Tải ảnh PNG, JPEG, GIF hoặc WebP (tối đa 5 MiB) dạng base64, trả URL https công khai và kích thước. File giống hệt nhau trả cùng URL. | Có |

## Quy trình

1. **Nháp.** Gọi `blog_create_draft` với slug, locale (mặc định `vi`, hoặc `en`), tiêu đề, danh mục và `blocks`, một mảng JSON các widget block, mỗi block có `type`. Tải ảnh trước bằng `blog_upload_media` rồi dùng URL trả về trong block hoặc làm ảnh bìa.
2. **Validate.** Gọi `blog_validate` và sửa mọi lỗi. Cảnh báo không chặn việc xuất bản.
3. **Xem trước.** `blog_preview` trả liên kết riêng tư có hiệu lực 24 giờ. Liên kết mới thay thế liên kết cũ. Khi đó có thể đọc bản nháp tại `GET /api/public/blog/posts/{slug}?preview=<token>`, với `Cache-Control: no-store` và `X-Robots-Tag: noindex`. Chỉ chia sẻ cho người được phép xem bản nháp.
4. **Xuất bản, hai bước.** Gọi `blog_publish` không kèm token: công cụ validate bản nháp và trả `confirmation_required` cùng bản tóm tắt và một `confirm_token` dùng một lần. Đưa bản tóm tắt cho con người, chỉ khi họ đồng ý mới gọi lại `blog_publish` với token. Token gắn với đúng phiên bản đã duyệt, nên mọi chỉnh sửa đều cần duyệt lại.
5. **Sửa bài đang public.** Bài đã xuất bản không sửa được. Gọi `blog_unpublish` với `confirm: true` để đưa về nháp, sửa, rồi xuất bản lại.

Publish và unpublish gọi webhook revalidate của website để thay đổi hiện nhanh. Nếu chưa cấu hình webhook, website tự cập nhật theo chu kỳ revalidate 5 phút.

## Quy tắc nội dung

- **Danh mục cố định:** `announcements`, `product-updates`, `guides`, `introductions` và `engineering`.
- **Slug:** chữ thường, chữ số và dấu gạch nối, 3 đến 100 ký tự, duy nhất theo locale.
- **Giới hạn:** tiêu đề tối đa 200 ký tự, đoạn tóm tắt tối đa 400, tối đa 10 tag chữ thường nối bằng gạch ngang, tối đa 20 mục FAQ.
- **URL** phải là `https` trên host công khai. Địa chỉ IP, `localhost` và thông tin đăng nhập nhúng trong URL bị từ chối.
- **Embed** chỉ cho phép các host trong allowlist. Block YouTube chỉ nhận liên kết YouTube, và social embed chỉ nhận X/Twitter, Threads, LinkedIn, Facebook và YouTube.
- **Loại block lạ** chỉ gây cảnh báo, vì website validate lại block bằng schema riêng của nó.

## Tải media

`blog_upload_media` cần lưu trữ đối tượng (R2) trên server. Khi chưa cấu hình, công cụ trả `UNAVAILABLE`.

## API đọc công khai

Website đọc blog qua các route không cần xác thực dưới `/api/public/blog`:

| Route | Trả về |
|-------|--------|
| `GET /posts` | Bài đã xuất bản, có phân trang (`page`, `limit` tối đa 50, `locale`). Cache 60 giây. |
| `GET /posts/{slug}` | Một bài đã xuất bản. Với `?preview=<token>`, trả bản nháp ứng với token. |
| `GET /categories` | Các danh mục. |
| `GET /surveys/{survey_id}/results` | Kết quả của block khảo sát. |
| `POST /surveys/{survey_id}/votes` | Một phiếu bầu ẩn danh, với `optionIds` liệt kê 1 đến 10 lựa chọn. |

Phiếu bầu là ẩn danh. Mỗi trình duyệt, nhận diện bằng cookie, có một phiếu cho mỗi khảo sát, và một địa chỉ chỉ được tính tối đa 5 trình duyệt. Phiếu bầu còn bị giới hạn tần suất theo địa chỉ.

## Ghi chú vận hành

Các cài đặt này dành cho người vận hành TOSE API. Xem [Tự host](./self-hosting) cho phần cài đặt chung.

| Cài đặt | Mục đích |
|---------|----------|
| `BLOG_ENABLED` | Phải là `true` để đăng ký công cụ và route công khai. Mặc định tắt. |
| `BLOG_SITE_URL` | Website nhận webhook revalidate. Mặc định `https://tose.sh`. |
| `BLOG_REVALIDATE_SECRET` | Gửi trong header `x-revalidate-secret`; phải trùng secret revalidate của website. Nếu không có secret, hoặc `BLOG_SITE_URL` không phải https, webhook không được gửi để secret không bao giờ đi dạng rõ. |
| `TRUSTED_PROXY_CIDRS` | Địa chỉ người xem cho giới hạn phiếu bầu lấy từ `X-Real-IP` chỉ khi yêu cầu đến từ proxy tin cậy. Loopback và dải riêng luôn được tin, nên website phải chuyển địa chỉ của khách trong `X-Real-IP` khi gửi phiếu thay họ. |

## Ba bề mặt MCP khác nhau

| Bề mặt | Trạng thái | Mục đích | Tài liệu |
|--------|------------|----------|----------|
| Server MCP của TOSE (`tose-app`) | Đang chạy | Deployment cho thành viên workspace; công cụ blog cho quản trị viên nền tảng có `blog:write` | [Giao thức, OAuth và scope](/vi/mcp/oauth), [Agent access](/vi/mcp/agent-access) |
| WebMCP trong trình duyệt trên site công khai (`tose-web`) | Thử nghiệm, mặc định tắt | Ba tool dữ liệu công khai trong trình duyệt hỗ trợ: ước tính chi phí deploy và liệt kê trang (chỉ đọc), mở trang. Không đăng nhập, không gọi API | `docs/webmcp.md` trong repo của site |

WebMCP không bao giờ chạm vào tài khoản.

## Xem thêm

- [Giao thức, OAuth và scope](/vi/mcp/oauth)
- [Chương trình giới thiệu](./referral)
