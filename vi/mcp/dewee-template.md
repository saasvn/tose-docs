# Các route MCP công khai của template Dewee

Một instance template Dewee chạy gateway phía trước runtime Dewee. Gateway chuyển tiếp một tập path MCP và OAuth discovery cố định tới runtime, không có path nào khác dưới `/mcp/`. Trang này liệt kê các path đó và khi nào từng path trả lời.

Trang này nói về MCP server **bên trong instance Dewee của bạn**, không phải MCP connector của nền tảng TOSE trong [Giao thức, OAuth và scope](./oauth).

## Các path được định tuyến

| Path | Mục đích |
|------|---------|
| `/mcp/server` | Endpoint MCP công khai chuẩn (streamable HTTP). Dùng URL này trong client. |
| `/mcp` | Endpoint MCP cũ. Khi trình duyệt tải trang thông thường (`GET` hoặc `HEAD` với `Accept: text/html`, không có bearer token và không có header `Mcp-*`) thì vẫn mở dashboard. |
| `/mcp/workspace` | Endpoint MCP quản lý workspace. |
| `/.well-known/oauth-protected-resource[/...]` | Metadata OAuth protected-resource. Chỉ document của `/mcp/server` tồn tại; các path còn lại trả `404` dạng JSON. |

## Khi nào route trả lời

Gateway chỉ định tuyến. Runtime Dewee quyết định từng route đang bật hay tắt và xác thực request:

| Trạng thái | Kết quả |
|------------|---------|
| MCP công khai đang tắt | Các path này trả `404`. |
| MCP công khai đang bật, thiếu hoặc sai token | `401` kèm header `WWW-Authenticate`. |
| MCP công khai đang bật, token hợp lệ | Request được xử lý. |

Route `/mcp/server` theo cờ MCP công khai. OAuth discovery phụ thuộc cấu hình OAuth, còn `/mcp/workspace` phụ thuộc cấu hình workspace MCP. Giới hạn tốc độ và CORS cũng do runtime xử lý, nên gateway không thêm header CORS.

## Path không bao giờ được mở ra ngoài

`/mcp/bridge` là cầu nội bộ, được bảo vệ bằng gateway token và không bao giờ được proxy. Mọi path khác dưới `/mcp/` đều trả `404` từ bên ngoài container, kể cả path viết bằng `..`, `//` hoặc mã hoá phần trăm để tìm cách chạm tới path đã định tuyến.

## Streaming

Các route MCP được chuyển tiếp không buffer và không nén, nên server-sent events (SSE) tới ngay khi được tạo ra và kết nối có thể mở rất lâu.

## Kiểm tra các route

Từ bên ngoài instance, với host và token là giá trị giả định:

```bash
# MCP công khai tắt: 404. Bật mà không có token: 401 kèm WWW-Authenticate.
curl -i https://<your-instance-domain>/mcp/server

# Cầu nội bộ không bao giờ truy cập được: 404.
curl -i https://<your-instance-domain>/mcp/bridge
```

Xem [Agent access](./agent-access) cho connector của nền tảng và [OAuth scope](./oauth#scopes) để biết cách token được cấp ở đó.
