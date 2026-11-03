# Tasks: deploy và rollback bền vững

Client hỗ trợ extension tasks của MCP (`io.modelcontextprotocol/tasks`) sẽ nhận về một **task** khi yêu cầu deploy hoặc rollback, thay vì một plan dùng một lần. Task tồn tại qua các lần khởi động lại và có thể theo dõi cho đến khi deployment kết thúc. Client không có extension vẫn dùng luồng hai bước: lần gọi đầu trả về plan, `approval_url` và `approval_token` dùng một lần, bạn duyệt plan trong trình duyệt, rồi client gọi lại tool kèm token.

## Vòng đời

| Trạng thái | Ý nghĩa |
|------------|---------|
| `input_required` | Plan đang chờ bạn. Task có link tới trang duyệt. |
| `working` | Bạn đã duyệt và deployment đang chạy. |
| `cancelled` | Task đã bị hủy. Xem [Hủy task](#huy-task). |
| `completed` | Deployment đã live hoặc đã thất bại. Thất bại, plan bị từ chối hoặc phê duyệt hết hạn đều kết thúc task bằng kết quả lỗi mở đầu bằng một mã ổn định như `DEPLOY_FAILED`, `APPROVAL_DECLINED` hoặc `APPROVAL_EXPIRED`. |

## Việc duyệt vẫn diễn ra trên trình duyệt

Agent không thể tự duyệt task của mình. Bạn mở trang duyệt, đăng nhập bằng tài khoản của bạn, rồi duyệt hoặc từ chối plan. Chỉ sau đó client mới báo task tiếp tục. Nếu bạn chưa duyệt, task giữ nguyên `input_required`.

## Poll và hết hạn

- **Poll:** client gọi `tasks/get` khoảng mỗi 5 giây. Server không gửi thông báo trạng thái task, nên client bắt buộc phải poll.
- **Hết hạn:** task có TTL 24 giờ kể từ lúc tạo.
- **Cô lập:** task chỉ hiển thị với đúng người dùng, workspace, OAuth client và kết nối đã tạo ra nó. Task quá hạn được báo là đã hết hạn.

## Hủy task

| Thời điểm | Kết quả |
|-----------|---------|
| Trước khi deployment bắt đầu | Phê duyệt bị vô hiệu vĩnh viễn. Không có gì được deploy. |
| Sau khi deployment bắt đầu | Không thể dừng deployment đang chạy. Yêu cầu hủy được ghi trong status message của task, và task vẫn báo kết quả thật của deployment. |

## Xem task ở đâu

Panel **Agent tasks** ở trang project liệt kê các task mà agent đã kết nối tạo cho project đó. Xem [Agent access](./agent-access#agent-tasks-va-copy-for-agent).
