# Ngân sách autoscaling

Ngân sách autoscaling giới hạn số tiền compute mà một workspace hoặc một project được phép cấu hình để chi. Nó đặt trần chi phí theo giờ và theo tháng, và có thể giữ một **floor**: mức phân bổ tối thiểu luôn được đảm bảo đủ tiền trong 72 giờ. Mọi thay đổi làm mức phân bổ vượt trần đều bị từ chối trước khi xảy ra.

::: info Nhà vận hành nền tảng bật tính năng này
Ngân sách mặc định tắt. Khi tính năng tắt, các route ngân sách trả `404`, các tool ngân sách không xuất hiện, và không có lần deploy hay scale nào bị từ chối vì lý do ngân sách. Trên nền tảng có bật, `GET /api/public/features` trả `autoscaling_budget: true` (xem [Tính năng nền tảng](/vi/api/reference#platform-features)).
:::

## Ngân sách tính những gì

Ngân sách chỉ tính **compute của project**: CPU và RAM của các replica project đang chạy hoặc đang khởi động. Template, database, ổ đĩa, desktop, runtime và CI có cách tính tiền hoặc ngân sách riêng nên không được tính ở đây.

Có hai phạm vi:

| Phạm vi | Giới hạn gì |
|---------|-------------|
| Workspace | Trần theo giờ và theo tháng cho tổng chi phí của mọi project trong workspace. |
| Project | Trần theo giờ và theo tháng cho một project, cùng floor của project đó. |

Ngân sách trống (không có trần, không có floor) không thay đổi gì: không có gì bị từ chối và không có kiểm tra bổ sung nào.

## Trần chi phí

Trần là một số tiền USD theo giờ hoặc theo tháng. Có thể đặt một trần hoặc cả hai, và `none` xóa một trần.

- **Trần theo giờ:** chi phí cấu hình theo giờ của các project đang chạy hoặc đang khởi động phải nhỏ hơn hoặc bằng trần. Số replica, CPU và RAM đều được tính.
- **Trần theo tháng:** chi phí đã tính trong tháng UTC này, cộng chi phí theo giờ hiện tại cho phần còn lại của tháng, phải nhỏ hơn hoặc bằng trần.

Trang ngân sách và `tose autoscaling budget get` hiển thị các con số đằng sau một trần: chi phí theo giờ hiện tại, lũy kế tháng và dự báo cả tháng.

### Điều gì bị từ chối

Việc kiểm tra chạy khi bạn cố **tăng** mức phân bổ. Các hành động sau trả `402 BUDGET_CAP` nếu chúng làm vượt một trần:

- đổi số replica, CPU hoặc RAM của project,
- deploy, redeploy hoặc rollback,
- deploy image, và áp dụng thay đổi biến môi trường khiến project khởi động lại,
- runbook khôi phục đã được duyệt có scale project.

Lỗi nêu trần nào sẽ bị vượt (`workspace_hourly`, `workspace_monthly`, `deployment_hourly` hoặc `deployment_monthly`), giới hạn của nó và mức chi phí mà thay đổi sẽ đạt tới. Xem [`BUDGET_CAP`](/vi/api/errors#BUDGET_CAP).

Hai việc không bao giờ bị từ chối: giảm mức phân bổ, và khôi phục project về trạng thái trước khi bị dừng. Khôi phục trạng thái cũ sau khi nạp tiền không phải là một lần tăng mới.

::: tip Nhiều lần khởi động cùng lúc
Hai request mà mỗi cái vừa với trần nhưng cộng lại thì không sẽ được xử lý lần lượt: cái thứ hai bị từ chối. Việc kiểm tra thiên về an toàn. Project có deployment chưa kết thúc được tính theo chi phí đã cấu hình, nên có thể tạm thời bị tính hai lần và từ chối một thay đổi lẽ ra vừa với trần.
:::

## Floor và quỹ dự phòng 72 giờ

**Floor** của project là mức phân bổ nhỏ nhất bạn muốn luôn giữ chạy: một số replica, mỗi replica có CPU và RAM nhất định. **Quỹ dự phòng** của workspace là chi phí của mọi floor trong 72 giờ.

Một lần tăng bị từ chối với `402 INSUFFICIENT_BALANCE` và `details.reason = "floor_reserve"` khi số dư ví chưa được dự phòng không đủ trả các floor trong 72 giờ cộng thêm một giờ của mức phân bổ mới. Khi các floor đang thiếu tiền, mọi lần tăng đều bị từ chối cho đến khi ví được nạp thêm.

Ngân sách cho biết quỹ dự phòng đã đủ tiền chưa và floor được phủ bao nhiêu giờ, tối đa 72. Nó không bao giờ hiển thị số dư ví. Chi phí theo giờ của floor không được cao hơn trần theo giờ của project.

## Không tự động giảm

Ngân sách chỉ **từ chối việc tăng**. Nó không bao giờ tự dừng project, bỏ replica hay giảm CPU hoặc RAM. Nếu bạn đặt trần thấp hơn mức đang chạy, workload đang chạy vẫn giữ nguyên; chỉ các lần tăng tiếp theo bị từ chối. Muốn giảm chi phí, hãy tự thay đổi project.

## Ai được đổi ngân sách, và agent được duyệt thế nào

| Hành động | Ai |
|-----------|----|
| Xem ngân sách | Mọi thành viên workspace |
| Đổi ngân sách | Owner hoặc admin của workspace |
| Duyệt hoặc từ chối thay đổi của agent | Owner hoặc admin của workspace, đã đăng nhập dashboard |

Cách một thay đổi có hiệu lực phụ thuộc vào credential:

- **Phiên đăng nhập** (dashboard, hoặc `tose` đăng nhập bằng tài khoản của bạn): thay đổi được áp dụng ngay.
- **API key của workspace, hoặc agent qua MCP:** thay đổi **không** được áp dụng. API trả `202` kèm một **kế hoạch** (thay đổi gì, từ giá trị nào sang giá trị nào) và liên kết tới dashboard, rồi kế hoạch chờ một người.
- Owner hoặc admin đã đăng nhập mở liên kết, kiểm tra kế hoạch, rồi duyệt hoặc từ chối. Việc duyệt chỉ làm được trên dashboard; API key hoặc OAuth token cố duyệt sẽ nhận `403 HUMAN_APPROVAL_REQUIRED`.
- Kế hoạch có hiệu lực 30 phút. Nếu ngân sách đã thay đổi sau khi kế hoạch được tạo, việc duyệt thất bại với `PLAN_STALE` và agent phải tạo kế hoạch mới.
- Dashboard gửi kèm hash của kế hoạch mà người dùng đã xem khi quyết định, nên kế hoạch đã đổi sau khi xem sẽ không bị duyệt nhầm (`PLAN_HASH_MISMATCH`). Nếu project đã lớn hơn kể từ khi tạo kế hoạch và floor của nó giờ có chi phí cao hơn trần theo giờ của kế hoạch, việc duyệt thất bại với `INVALID_ARGUMENT` (`422`).

Nhờ vậy con người vẫn nắm quyền quyết định giới hạn chi tiêu, kể cả khi agent làm việc. Xem [API ngân sách](/vi/api/autoscaling-budget) để biết route và cấu trúc chính xác.

## Cách dùng

| Ở đâu | Cách làm |
|-------|----------|
| CLI | [`tose autoscaling budget get` và `set`](/vi/commands/autoscaling) |
| REST API | [API ngân sách autoscaling](/vi/api/autoscaling-budget) |
| Dashboard | Trang **Autoscaling** của workspace, nơi kế hoạch được duyệt |
| MCP | `autoscaling_budget_get` đọc ngân sách; `autoscaling_budget_plan` đề xuất thay đổi và trả liên kết duyệt. Xem [MCP connector](/vi/mcp#tools) |
| WebMCP (trong dashboard) | `get_autoscaling_budget`, chỉ đọc |

## Liên quan

- [Bảng giá](/vi/guide/pricing)
- [Mã lỗi](/vi/api/errors)
