# Agent access trong dashboard

**Agent access** là một mục trong phần cài đặt workspace, nơi bạn kết nối AI agent, xem từng agent được phép làm gì, thu hồi kết nối và xem lại những gì chúng đã làm.

## Kết nối một agent

1. Mở **Settings** của workspace và tìm **Agent access**.
2. Sao chép **MCP server URL** bằng nút **Copy URL**.
3. Thêm URL vào client, rồi đăng nhập TOSE khi client yêu cầu, chọn workspace và chọn quyền cho phép.

| Client | Các bước |
|--------|----------|
| Claude | Settings, Connectors, Add custom connector, dán URL. |
| ChatGPT | Settings, Apps & Connectors, Create (developer mode), dán URL, rồi đăng nhập bằng OAuth. |
| Cursor | Thêm `{"mcpServers":{"tose":{"url":"<MCP server URL>"}}}` vào `~/.cursor/mcp.json`. |
| VS Code | Chạy **MCP: Add Server**, chọn HTTP và dán URL. |

Nếu mục này báo MCP connector chưa được bật, nghĩa là server đó đang tắt nó. Agent vẫn có thể dùng API key của workspace với CLI hoặc API.

## Agent được phép làm gì

Trang cài đặt hiển thị bảng scope: có những scope nào, scope nào thay đổi production và ai được cấp. Các scope giống mục [scope OAuth](./oauth#scope). Thành viên, thanh toán, biến môi trường, database và hạ tầng không bao giờ mở cho agent, và scope ghi cần owner hoặc admin.

## Các agent đã kết nối

Danh sách hiển thị các kết nối bạn đã cấp quyền: client, workspace, scope, lần dùng gần nhất và thời điểm hết hạn. **Revoke** đăng xuất agent đó ngay lập tức.

## Lịch sử audit

**Your recent agent activity in this workspace** liệt kê mọi lần gọi tool mà agent thực hiện bằng kết nối của bạn, gồm thời gian, tool, project, kết quả và client. Tham số và kết quả không được lưu.

## Agent tasks và Copy for agent

Trên trang project:

- **Agent tasks** liệt kê các deploy và rollback mà agent đã yêu cầu, cùng trạng thái và link để duyệt hoặc xem deployment. Không có gì chạy cho đến khi bạn duyệt. Xem [Tasks](./tasks).
- **Copy for agent** sao chép ngữ cảnh project an toàn để dán vào agent: slug, link và deployment mới nhất. Không chứa bí mật nào.
