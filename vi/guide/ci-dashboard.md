# CI trong dashboard

Dashboard của workspace có các trang CI cho pipeline, kế hoạch chạy, trạng thái run, log của job, chẩn đoán, mức sử dụng và hạn mức ngân sách. Các trang này gọi cùng các route CI của workspace như một API key, nhưng dưới danh nghĩa bạn đang đăng nhập, nên máy chủ vẫn kiểm tra vai trò của bạn ở mỗi thao tác và dashboard không làm được gì mà API không cho phép. Route và công cụ MCP được mô tả trong [tài liệu tham chiếu TOSE CI](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#dashboard).

## Mở CI {#open}

Chọn **CI** ở thanh bên của workspace (`/w/{slug}/ci`). Các tab là **Pipelines**, **Usage**, **Budget caps** và **Agent profiles**. Agent profiles được đánh dấu "Soon": trang này cho biết tính năng chưa khả dụng.

## Pipeline {#pipelines}

Tab Pipelines liệt kê từng pipeline cùng run mới nhất và nút **Run**. Pipeline đã bị tắt thì không chạy được.

Nếu danh sách trống, chưa có repository nào được kết nối. Việc kết nối repository (onboarding) vẫn do operator thực hiện qua admin API; dashboard chưa có bước onboarding.

Mở một pipeline để xem:

- **Kế hoạch của lần chạy thủ công tiếp theo.** Có chạy được không, các lý do chặn nếu không, CPU, bộ nhớ, timeout và chi phí trường hợp xấu nhất của từng job, tổng cộng và số dư ví của bạn.
- **Hạn mức của pipeline** cùng trạng thái và liên kết để chỉnh sửa.
- **Các run của pipeline**, có nút **Load more**.

## Chạy thủ công {#run}

1. Mở pipeline và chọn **Run**. Dashboard lấy kế hoạch trước. Nếu run sẽ bị từ chối, dashboard hiển thị lý do và không khởi chạy gì.
2. Nếu không, hộp thoại xác nhận hiển thị commit, nhánh, repository, chi phí trường hợp xấu nhất của run và của job lớn nhất, cùng quy tắc trả trước: chưa giữ chỗ gì cho đến khi từng job bắt đầu, và job có chi phí trường hợp xấu nhất vượt quá ví hoặc một hạn mức sẽ bị từ chối, không bao giờ chạy bằng tín dụng nợ.
3. Xác nhận để bắt đầu. Bạn được chuyển tới trang của run.

Run thủ công chỉ chạy lại một commit mà TOSE đã ghi nhận từ push hoặc pull request của pipeline; nó không thể đưa code mới vào hay chạy fork.

### Thử lại an toàn {#retries}

Khi bạn xác nhận, dashboard ghim commit bạn đã thấy và gửi yêu cầu kèm `Idempotency-Key`. Nếu yêu cầu lỗi vì lỗi mạng hoặc lỗi máy chủ (5xx), lần thử tiếp theo sẽ gửi lại đúng commit và khóa đó, không hỏi lại, kể cả khi đã có commit mới hơn. API trả về run đầu tiên thay vì tạo run thứ hai, và dashboard báo run đã được khởi chạy trước đó. Lỗi từ chối mà thử lại không khắc phục được (ví dụ `402`, `409` hoặc `422`) sẽ bỏ yêu cầu đã ghim, nên lần thử sau lấy lại kế hoạch mới.

Các lần từ chối được giải thích bằng văn bản thường: `402` do ví hoặc hạn mức ngân sách, `409` khi CI bị tắt hoặc pipeline bị vô hiệu hóa, `422` khi commit chưa được ghi nhận, `429` khi workspace đã có 10 run thủ công chưa kết thúc, và `403 person_required` khi thao tác cần chủ sở hữu hoặc admin đăng nhập.

## Xem một run và một job {#inspect}

Chọn một run để mở trang của nó (`/w/{slug}/ci/runs/{id}`). Trang hiển thị:

- **Tóm tắt.** Trạng thái, commit, nhánh, nguồn kích hoạt và pull request, chi phí và thời gian chạy, cùng liên kết tới GitHub checks và pipeline.
- **Đồ thị job.** Các job được vẽ theo tầng từ `needs` của từng job.
- **Từng job.** Các bước kèm exit code, lý do kết thúc, số lần thử, cờ lỗi nền tảng hoặc job cần xem xét, và job có bị tính phí hay không.
- **Log đã lưu.** Bật nút log của job để tải phần cuối log đã lưu và đã che bí mật. Log hiển thị dưới dạng văn bản thuần và được gắn nhãn là đầu ra không đáng tin của code đang được kiểm thử.
- **Chẩn đoán.** Với run không đạt, lý do từng job thất bại, kèm gợi ý và bước bị lỗi.

Trang tự làm mới mỗi 5 giây cho đến khi run kết thúc và dừng khi bạn rời trang.

Run thành công nhưng có job bị bỏ qua được hiển thị là "Passed with skipped jobs" với màu cảnh báo, không bao giờ là đạt bình thường. Job cần xem xét cũng khiến run không hiển thị là đạt.

### Chạy lại hoặc hủy run {#retry}

- **Run again** ghi nhận một run thủ công mới của cùng commit. Nó hiển thị kế hoạch và xin xác nhận giống hệt **Run**, và thử lại an toàn theo cách tương tự.
- **Cancel** xin xác nhận, rồi dừng các job đang chờ và đang chạy. Job đang chạy được tính phí theo số giây đã chạy.

Một bước bị lỗi không bao giờ được thử lại trong cùng run; **Run again** bắt đầu một run mới.

## Mức sử dụng {#usage}

Tab Usage cộng chi phí CI theo ngày, pipeline, run, job hoặc loại trong một khoảng ngày UTC, kèm tổng và ghi chú khi các dòng bị cắt bớt. Dòng pipeline hiển thị tên repository, còn dòng run và job liên kết tới run.

## Hạn mức ngân sách {#budget-caps}

Tab Budget caps hiển thị hạn mức ngày và tháng của toàn workspace, tỷ lệ cảnh báo và hạn mức của từng pipeline, với thanh đo đã chi, đang giữ và còn lại.

| Vai trò của bạn | Bạn làm được gì |
|-----------------|-----------------|
| Thành viên | Xem hạn mức và mức sử dụng. Trang chỉ đọc. |
| Chủ sở hữu hoặc admin | Xem, và chỉnh hạn mức bằng USD. |

Khi chỉnh sửa:

- Số tiền được kiểm tra đến từng cent và không bao giờ làm tròn.
- Mỗi lần lưu gửi `If-Match`. Nếu có người đã đổi hạn mức kể từ lúc bạn tải, trang tải lại giá trị hiện tại và báo cho bạn thay vì ghi đè.
- Xóa hạn mức cần xác nhận.
- Hạn mức 0 nghĩa là không giới hạn. Số dư ví luôn là hạn mức cuối cùng.

Dashboard là phiên đăng nhập, nên chủ sở hữu hoặc admin có thể tăng hoặc xóa hạn mức tại đây, điều mà API key hay agent không làm được. Mọi thay đổi đều nằm trong nhật ký kiểm toán của workspace. Mô hình hạn mức được giải thích trong [tài liệu tham chiếu TOSE CI](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#budget-caps).

## Chưa khả dụng {#limits}

- **Onboarding.** Kết nối repository, chọn nhánh và tệp cấu hình, và xem trước kế hoạch trước khi bật vẫn làm qua admin API.
- **Agent profiles.** Được đánh dấu "Soon" trong dashboard.
- **Trình soạn thảo và kiểm tra YAML**, màn hình flakiness và matrix, lý do chọn hoặc bỏ qua test, và dòng thời gian xếp hàng, thiết lập, kiểm thử, dọn dẹp.
- **Đề xuất bản sửa, mở issue hoặc pull request**, và chấp nhận outcome.
