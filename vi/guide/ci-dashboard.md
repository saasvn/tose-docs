# CI trong dashboard

Dashboard của workspace có các trang CI cho pipeline, kế hoạch chạy, trạng thái run, log của job, chẩn đoán, phê duyệt run từ fork, chính sách của pipeline, gợi ý tác động, mức sử dụng và hạn mức ngân sách. Các trang này gọi cùng các route CI của workspace như một API key, nhưng dưới danh nghĩa bạn đang đăng nhập, nên máy chủ vẫn kiểm tra vai trò của bạn ở mỗi thao tác và dashboard không làm được gì mà API không cho phép. Route và công cụ MCP được mô tả trong [tài liệu tham chiếu TOSE CI](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#workspace-ci-api).

## Mở CI {#open}

Chọn **CI** ở thanh bên của workspace (`/w/{slug}/ci`). Các tab là **Pipeline**, **Phê duyệt**, **Mức dùng**, **Hạn mức chi** và **Hồ sơ agent**. Hồ sơ agent được đánh dấu "Sắp có": trang này cho biết tính năng chưa khả dụng.

## Pipeline {#pipelines}

Tab Pipeline liệt kê từng pipeline cùng lần chạy mới nhất và nút **Chạy**. Pipeline đã bị tắt thì không chạy được.

Nếu danh sách trống, chưa có repository nào được kết nối. Việc kết nối repository (onboarding) vẫn do operator thực hiện qua admin API; dashboard chưa có bước onboarding.

Mở một pipeline để xem:

- **Kế hoạch của lần chạy thủ công tiếp theo.** Có chạy được không, các lý do chặn nếu không, CPU, bộ nhớ, timeout và chi phí trường hợp xấu nhất của từng job, tổng cộng và số dư ví của bạn.
- **Hạn mức của pipeline** cùng trạng thái và liên kết để chỉnh sửa.
- **Liên kết tới gợi ý tác động** của pipeline, kèm số gợi ý đang mở.
- **Chính sách của pipeline.** Xem [Chính sách](#policies).
- **Các run của pipeline**, có nút **Tải thêm**.

## Chính sách {#policies}

Mục **Chính sách** trên trang pipeline chứa các quy tắc TOSE áp dụng cho pipeline. Chúng được đặt ở đây, không bao giờ do cấu hình trong repository quyết định.

- **Pull request từ fork.** **Không bao giờ chạy** (mặc định: run bị bỏ qua kèm giải thích) hoặc **Chạy sau khi phê duyệt** (mỗi run chờ ở tab [Phê duyệt](#approvals)). Khi chuyển sang **Chạy sau khi phê duyệt**, dashboard xin xác nhận.
- **Số lần chạy cùng lúc** và **số job cùng lúc** cho toàn repository. Để trống là không giới hạn; tối đa 100 lần chạy và 20 job.
- **Quy tắc theo nhánh.** Tối đa 20 mẫu nhánh (`main`, `release/*`), mỗi mẫu có giới hạn lần chạy và job riêng. Run của pull request được tính cho nhánh mà nó nhắm tới.

Lưu sẽ thay thế toàn bộ chính sách của pipeline. Run đang chạy vẫn tiếp tục; run đang chờ theo chính sách mới.

| Vai trò của bạn | Việc bạn làm được |
|-----------------|-------------------|
| Thành viên | Xem chính sách. |
| Chủ sở hữu hoặc quản trị viên | Xem và chỉnh sửa. |

## Phê duyệt {#approvals}

Tab **Phê duyệt** (`/w/{slug}/ci/approvals`) liệt kê các run của pull request từ fork đang chờ một người quyết định, khi chính sách fork của pipeline là **Chạy sau khi phê duyệt**. Mỗi mục hiển thị repository, pull request, commit và các nhánh, kèm liên kết tới pull request trên GitHub và tới trang run.

Mọi thành viên của workspace đều có thể **Phê duyệt và chạy** hoặc **Từ chối** (kèm lý do nếu muốn). Cả hai đều xin xác nhận. Run được phê duyệt không nhận secret nào và dùng cấu hình CI của nhánh đích. Run bị từ chối kết thúc ở trạng thái đã hủy và không đoạn code nào của nó được chạy. Mỗi lần push mới lên pull request cần phê duyệt lại. API key và ứng dụng đã kết nối không thể phê duyệt hay từ chối run.

## Gợi ý tác động {#suggestions}

Trang gợi ý của một pipeline (`/w/{slug}/ci/p/{id}/suggestions`) liệt kê các đề xuất TOSE rút ra từ lịch sử CI của pipeline để bớt chạy những job không cần thiết trên pull request: thêm chọn job theo tác động, gắn job với target, thêm đường dẫn target, tách job, sửa lỗi sót của đồ thị hoặc đánh dấu job chập chờn. Mỗi gợi ý có một thay đổi đề xuất cho `.tose/ci.yml` với nút **Sao chép**, kèm bằng chứng. Lọc theo **Đang mở**, **Đã chấp nhận**, **Đã bỏ qua** hoặc **Tất cả**.

Gợi ý chỉ là bản ghi. TOSE chỉ đọc được repository, nên chấp nhận một gợi ý không thay đổi gì: bạn tự sửa `.tose/ci.yml`. Không gợi ý nào xóa test. Chủ sở hữu và quản trị viên có thể **Chấp nhận** hoặc **Bỏ qua** gợi ý kèm ghi chú tùy chọn; thành viên chỉ xem.

## Chạy thủ công {#run}

1. Mở pipeline và chọn **Chạy**. Dashboard lấy kế hoạch trước. Nếu run sẽ bị từ chối, dashboard hiển thị lý do và không khởi chạy gì.
2. Nếu không, hộp thoại xác nhận hiển thị commit, nhánh, repository, chi phí trường hợp xấu nhất của run và của job lớn nhất (hoặc ghi chú rằng chi phí sẽ biết khi run đọc cấu hình), cùng quy tắc trả trước: mỗi job giữ trước mức tối đa của nó từ ví trả trước khi bắt đầu và chỉ bị tính theo số giây thực chạy.
3. Xác nhận để bắt đầu. Bạn được chuyển tới trang của run.

Run thủ công chỉ chạy lại một commit mà TOSE đã ghi nhận từ push hoặc pull request của pipeline; nó không thể đưa code mới vào hay chạy fork.

### Thử lại an toàn {#retries}

Khi bạn xác nhận, dashboard ghim commit bạn đã thấy và gửi yêu cầu kèm `Idempotency-Key`. Nếu yêu cầu lỗi vì lỗi mạng, `429` hoặc lỗi máy chủ (5xx), lần thử tiếp theo sẽ gửi lại đúng commit và khóa đó, không hỏi lại, kể cả khi đã có commit mới hơn. API trả về run đầu tiên thay vì tạo run thứ hai, và dashboard báo run đã được khởi chạy trước đó. Lỗi từ chối mà thử lại không khắc phục được (ví dụ `402`, `409` hoặc `422`) sẽ bỏ yêu cầu đã ghim, nên lần thử sau lấy lại kế hoạch mới. Điểm ghim nằm trong trang đang mở: tải lại hoặc rời trang sẽ làm mất nó, và lần thử sau lấy kế hoạch mới.

Các lần từ chối được giải thích bằng văn bản thường: `402` do ví hoặc hạn mức ngân sách, `409` khi CI bị tắt, pipeline bị vô hiệu hóa hoặc khóa idempotency bị dùng cho commit khác, `422` khi commit chưa được ghi nhận, và `429` khi workspace đã có 10 run thủ công chưa kết thúc.

## Xem một run và một job {#inspect}

Chọn một run để mở trang của nó (`/w/{slug}/ci/runs/{id}`). Trang hiển thị:

- **Tóm tắt.** Trạng thái, commit, nhánh, nguồn kích hoạt và pull request, chi phí và thời gian chạy, cùng liên kết tới GitHub checks và pipeline.
- **Đồ thị job.** Các job được vẽ theo tầng từ `needs` của từng job.
- **Từng job.** Các bước kèm exit code, lý do kết thúc, số lần thử (khi lớn hơn 1), cờ lỗi nền tảng hoặc job cần xem xét, và job có bị tính phí hay không.
- **Log đã lưu.** Bật nút log của job để tải phần cuối log đã lưu và đã che bí mật. Log hiển thị dưới dạng văn bản thuần và được gắn nhãn là đầu ra không đáng tin của code đang được kiểm thử.
- **Chẩn đoán.** Với run không đạt, lý do từng job thất bại, kèm gợi ý và bước bị lỗi.

Trang tự làm mới mỗi 5 giây cho đến khi run kết thúc và dừng khi bạn rời trang.

Run thành công nhưng có job bị bỏ qua được hiển thị là "Đạt nhưng có job bị bỏ qua" với màu cảnh báo, không bao giờ là đạt bình thường. Job cần xem xét cũng khiến run không hiển thị là đạt.

### Chạy lại hoặc hủy run {#retry}

- **Chạy lại** ghi nhận một run thủ công mới của cùng commit. Nó hiển thị kế hoạch và xin xác nhận giống hệt **Chạy**, và thử lại an toàn theo cách tương tự.
- **Hủy lần chạy** xin xác nhận, rồi dừng các job đang chờ và đang chạy. Job đang chạy được tính phí theo số giây đã chạy.

**Chạy lại** xuất hiện trên run đã kết thúc, còn **Hủy lần chạy** xuất hiện trên run chưa kết thúc và chưa có yêu cầu hủy. Một bước bị lỗi không bao giờ được thử lại trong cùng run; **Chạy lại** bắt đầu một run mới.

## Mức sử dụng {#usage}

Tab Mức dùng cộng chi phí CI theo ngày, pipeline, run, job hoặc loại trong một khoảng ngày UTC, kèm tổng và ghi chú khi các dòng bị cắt bớt. Dòng pipeline hiển thị tên repository, còn dòng run và job liên kết tới run.

## Hạn mức ngân sách {#budget-caps}

Tab Hạn mức chi hiển thị hạn mức ngày và tháng của toàn workspace, tỷ lệ cảnh báo và hạn mức của từng pipeline, với thanh đo đã chi, đang giữ và còn lại.

| Vai trò của bạn | Bạn làm được gì |
|-----------------|-----------------|
| Thành viên | Xem hạn mức và mức sử dụng. Trang chỉ đọc. |
| Chủ sở hữu hoặc admin | Xem, và chỉnh hạn mức bằng USD. |

Khi chỉnh sửa:

- Số tiền tính bằng USD, tối đa hai chữ số thập phân, kiểm tra đến từng cent và không bao giờ làm tròn. Để trống ô nghĩa là không giới hạn. Số dư ví luôn là hạn mức cuối cùng.
- Chủ sở hữu và admin cũng đặt được mức cảnh báo, là số nguyên từ 1 đến 100: phần trăm hạn mức mà tại đó thành viên được cảnh báo.
- Mỗi lần lưu gửi `If-Match`. Nếu có người đã đổi hạn mức kể từ lúc bạn tải, trang tải lại giá trị hiện tại và báo cho bạn thay vì ghi đè.
- **Bỏ hạn mức** xóa cùng lúc mọi hạn mức của phạm vi đó, hoặc hạn mức toàn workspace hoặc hạn mức của một pipeline, và xin xác nhận trước.

Dashboard là phiên đăng nhập, nên chủ sở hữu hoặc admin có thể tăng hoặc xóa hạn mức tại đây, điều mà API key hay agent không làm được. Mọi thay đổi đều nằm trong nhật ký kiểm toán của workspace. Mô hình hạn mức được giải thích trong [tài liệu tham chiếu TOSE CI](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#budget-caps).

## Chưa khả dụng {#limits}

- **Onboarding.** Kết nối repository, chọn tệp cấu hình và xem trước kế hoạch trước khi bật vẫn làm qua admin API. Nhánh được chọn trong `.tose/ci.yml`.
- **Hồ sơ agent.** Được đánh dấu "Sắp có" trong dashboard.
- **Trình soạn thảo và kiểm tra YAML**, màn hình flakiness và matrix, lý do chọn hoặc bỏ qua test, và dòng thời gian xếp hàng, thiết lập, kiểm thử, dọn dẹp.
- **Đề xuất bản sửa, mở issue hoặc pull request**, và chấp nhận outcome.
