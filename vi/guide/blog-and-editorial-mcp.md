# Blog, widget và MCP biên tập

::: warning Chưa khả dụng
Blog động, widget catalog và server MCP biên tập mới ở mức **dự kiến, chưa phát hành**. Hiện chưa có tool hay endpoint nào như vậy trong ứng dụng TOSE. Trang này ghi lại kế hoạch và ranh giới để không ai nhầm với tính năng đang chạy. Nó sẽ trở thành hướng dẫn đầy đủ khi từng giai đoạn được phát hành.
:::

## Dự kiến gồm gì

| Mảng | Kế hoạch |
|------|----------|
| Mô hình blog | Bài viết có revision, asset và widget block, phiên bản schema, quy trình draft, review, publish hoặc schedule, archive, nội dung VI/EN. |
| Widget | Khối ảnh, gallery, video, YouTube, social embed, quote, code, biểu đồ, workflow, diagram, survey và sandbox; mỗi loại có thuộc tính, fallback, accessibility và quy tắc bảo mật. |
| MCP biên tập | Các tool có bảo vệ OAuth để liệt kê, đọc, tạo nháp, cập nhật, xuất bản và lên lịch bài viết, validate widget, tải asset và đọc audit. |

Tên tool, scope và ví dụ chỉ được công bố sau khi chạy thử với implementation đã phát hành.

## Ba bề mặt MCP khác nhau

| Bề mặt | Trạng thái | Mục đích | Tài liệu |
|--------|------------|----------|----------|
| Server MCP triển khai của TOSE (`tose-app`) | Đang chạy | Lập kế hoạch, duyệt và chạy deployment với quyền OAuth có scope | [Giao thức, OAuth và scope](/vi/mcp/oauth), [Agent access](/vi/mcp/agent-access) |
| WebMCP trong trình duyệt trên site công khai (`tose-web`) | Thử nghiệm, mặc định tắt | Ba tool chỉ đọc dữ liệu công khai trong trình duyệt hỗ trợ: ước tính chi phí deploy, liệt kê trang, mở trang. Không đăng nhập, không gọi API | `docs/webmcp.md` trong repo của site |
| Server MCP biên tập blog | Dự kiến | Quản lý nội dung blog | Trang này |

Server triển khai không quản lý nội dung blog, và WebMCP không bao giờ chạm vào tài khoản.

## Xem thêm

- [Chương trình giới thiệu](./referral)
