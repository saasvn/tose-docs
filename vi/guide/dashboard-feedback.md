# Báo vấn đề ngay từ dashboard

Bạn có thể báo lỗi hoặc đề xuất tính năng mà không rời dashboard. Báo cáo đi tới đội TOSE qua cùng dịch vụ với [Feedback API](/vi/api/feedback): bí mật và dữ liệu cá nhân bị loại bỏ, báo cáo được định tuyến và các báo cáo được chấp nhận sẽ được đăng thành issue GitHub.

::: warning Tình trạng
Trang chỉ hiển thị khi triển khai của bạn bật feedback. Nếu tắt, các liên kết bị ẩn và trang cho biết feedback không khả dụng.
:::

## Tìm ở đâu

Mở `/w/{slug}/feedback` từ liên kết **Góp ý** ở header hoặc từ menu người dùng. Với một deployment thất bại, **Báo lỗi này cho TOSE** mở cùng biểu mẫu với trang bạn vừa xem, khu vực `deployments` và mã lỗi `deployment_failed` đã được điền sẵn.

## Gửi báo cáo

1. Chọn **Loại** và **Khu vực**. Khu vực quyết định repository TOSE nào nhận báo cáo. Nếu không chắc, chọn **Khác**; khi đó sẽ có người định tuyến.
2. Viết **Tiêu đề** và **Mô tả**, và tùy chọn **Các bước tái hiện**. Không dán bí mật, biến môi trường hay log.
3. Chỉ tick **Đính kèm thông tin chẩn đoán** nếu bạn đồng ý chia sẻ các giá trị liệt kê trên biểu mẫu (client, phiên bản và mã lỗi). Không bao giờ gồm biến môi trường, token hay log. Để trống nếu không muốn gửi.
4. Bấm **Xem trước báo cáo**. Bản xem trước cho thấy TOSE nhận được gì, với các giá trị giống bí mật hoặc dữ liệu cá nhân được che. TOSE che lại một lần nữa ở máy chủ, nên bản xem trước chỉ gần đúng.
5. Bấm **Gửi báo cáo**, hoặc **Sửa** để quay lại.

Báo cáo cần che dữ liệu, liên quan thanh toán hoặc không định tuyến được sẽ do một người xem xét trước khi đăng.

## Theo dõi báo cáo của bạn

**Báo cáo của bạn trong workspace này** liệt kê các báo cáo bạn đã gửi, mới nhất trước, mỗi báo cáo kèm lịch sử trạng thái và, khi GitHub đã xác nhận, liên kết tới issue. Bạn chỉ thấy báo cáo của chính mình: báo cáo của đồng đội không bao giờ được liệt kê. Các trạng thái giống [Feedback API](/vi/api/feedback#trang-thai).

Danh sách này cũng có qua API:

```http
GET /api/workspaces/{slug}/feedback
```

Cần là thành viên workspace và, với API key, scope `workspace:read`. API key chỉ thấy workspace của chính nó. Tham số `limit` tùy chọn từ 1 đến 100 (mặc định 100). Xem [Feedback API](/vi/api/feedback#liet-ke-bao-cao-trong-workspace).

Agent có thể gửi và đọc báo cáo qua [MCP](/vi/mcp#cong-cu-feedback).
