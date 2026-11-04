# Tương thích client

Connector hoạt động với mọi client hỗ trợ MCP từ xa qua Streamable HTTP và OAuth, vì nó không phụ thuộc vào tính năng tùy chọn nào bên dưới. Bảng đầy đủ, được duy trì thường xuyên, là [`docs/mcp-client-matrix.md`](https://github.com/saasvn/tose-app/blob/master/docs/mcp-client-matrix.md) trong tose-app.

## Đã kiểm chứng với client thật

**Chưa có client nào.** Ma trận chỉ đánh dấu một client là đã kiểm chứng sau khi có người kết nối thật và ghi lại ngày cùng phiên bản. Kiểm thử tự động của TOSE không chạy client agent thật nào, nên không client nào được ghi là đã kiểm chứng. Claude, ChatGPT, Cursor, VS Code và MCP Inspector đều được kỳ vọng hoạt động dựa trên tài liệu của nhà cung cấp, không phải dựa trên một bài kiểm thử TOSE.

Kết quả được maintainer của TOSE ghi vào ma trận, kèm ngày và phiên bản client.

## ChatGPT

ChatGPT kết nối qua Client ID Metadata Document (`https://chatgpt.com/oauth/client.json`) và xác thực tại token endpoint bằng `private_key_jwt` (RS256, khóa lấy từ `jwks_uri` của document). Không cần đăng ký. TOSE liệt kê `private_key_jwt` trong `token_endpoint_auth_methods_supported`. ChatGPT chưa được đánh dấu là đã kiểm chứng: cần ghi lại ngày kết nối và phiên bản client.

## Server cung cấp gì

Những mục này được kiểm thử tự động trên server, không phải trên client:

| Tính năng | Trạng thái |
|-----------|------------|
| Streamable HTTP, stateless | Có |
| Revision 2026-07-28 cùng các revision 2025 và 2024-11-05 | Có |
| Client ID Metadata Document và đăng ký động | Có |
| Step-up `insufficient_scope` | Có |
| [Tasks](./tasks) cho deploy và rollback | Có, nhưng không có thông báo trạng thái task |
| View [Apps](./apps) | Có |
| [Skills](./skills) | Có |
| Prompts, resource subscription, thông báo task | Không có |

## Khi client thiếu một tính năng

- **Không có Tasks:** sau khi bạn duyệt plan, `deploy_project` trả về ngay với deployment ID, và agent poll `get_deployment_status` cho đến khi kết thúc.
- **Không có Apps:** plan và trạng thái trả về dạng văn bản thuần. Bạn duyệt trên trang duyệt trong trình duyệt, và có thể tự mở link đó.
- **Không có Skills:** hướng dẫn của server và mô tả tool mang cùng quy trình lập plan, duyệt, chạy và poll.
- **Revision giao thức cũ:** client nhận cùng bộ tool; chỉ khác tín hiệu khi thao tác ghi bị từ chối (xem [step-up](./oauth#step-up-insufficient-scope)).
