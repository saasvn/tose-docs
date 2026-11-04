# Bảng giá

TOSE tính phí theo mức sử dụng thực tế, trừ trực tiếp vào ví của workspace. Bạn trả cho hai thứ:

- **Compute** (CPU và RAM) khi workload đang chạy.
- **Lưu trữ** cho ổ đĩa bền vững khi ổ đĩa còn tồn tại.

Mức giá hiện hành luôn có tại [`tose pricing`](/vi/commands/disk#tose-pricing) hoặc endpoint công khai [`GET /api/pricing`](/vi/api/disks#get-pricing). Nếu trang này và API khác nhau, API là nguồn chuẩn.

## Compute {#compute}

Compute được tính theo giờ cho CPU và RAM cấp cho workload đang chạy. Mọi workspace đều trả cùng một **mức giá tiêu chuẩn**, bất kể số dư ví:

| Tài nguyên | Giá |
|------------|-----|
| CPU | $0.02 mỗi vCPU-giờ |
| RAM | $0.01 mỗi GB-giờ |

Giá không đổi khi số dư ví tăng hay giảm. Thay vào đó, các lần nạp tiền lớn trong một thanh toán được tặng [credit thưởng](#top-up-bonus). Giá ổ đĩa không đổi (xem [Lưu trữ](#storage)).

Compute **chỉ tính phí khi workload đang chạy**. Dừng dự án (`tose down`), ngủ hoặc bị tạm ngưng sẽ dừng tính phí compute.

## Thưởng khi nạp tiền {#top-up-bonus}

Một lần nạp ví từ $100 trở lên được tặng credit thưởng, cộng thêm vào số tiền bạn đã trả:

| Một lần nạp | Credit thưởng |
|-------------|---------------|
| Từ $100 | +10% |
| Từ $250 | +15% |
| Từ $500 (**Phổ biến nhất**) | +20% |
| Từ $1,000 | +25% |

Quy tắc:

- **Tính theo từng thanh toán.** Mức thưởng được chọn theo số tiền của một thanh toán. Hai lần nạp $60 không cộng lại thành một lần nạp $120. Thanh toán dưới $100 không có thưởng.
- **Credit riêng, không hết hạn.** Phần thưởng là một mục `topup_bonus` riêng trong lịch sử ví, ghi một lần cho mỗi thanh toán và không bao giờ hết hạn.
- **Chỉ áp dụng khi nạp ví.** Không tặng thưởng cho credit do quản trị viên cộng, credit khuyến mãi hoặc thanh toán mở khóa tính năng.
- **Không cộng dồn với mã khuyến mãi.** Thanh toán có áp mã khuyến mãi sẽ không nhận thưởng nạp tiền. Với thanh toán đó, hãy chọn mã hoặc mức thưởng.
- **Hoàn tiền thu hồi thưởng theo tỷ lệ.** Hoàn một phần thanh toán sẽ thu hồi cùng tỷ lệ của phần thưởng (làm tròn lên, nên hoàn toàn bộ sẽ thu hồi hết). Khoản trừ không bao giờ đưa số dư xuống dưới 0, nên phần thưởng đã tiêu không bị thu hồi.
- **Không thưởng hồi tố.** Số dư hiện có giữ nguyên giá trị. Chỉ các thanh toán hoàn tất sau thay đổi mới được thưởng.

Các mức thưởng có tại endpoint công khai [`GET /api/billing/topup-bonus`](/vi/api/disks#get-top-up-bonus) và trong khối `topup_bonus` của [`GET /api/pricing`](/vi/api/disks#get-pricing). Nếu trang này và API khác nhau, API là nguồn chuẩn.

## Lưu trữ {#storage}

Ổ đĩa bền vững (ổ đĩa dự án, ổ đĩa template và dung lượng cơ sở dữ liệu được quản lý) được tính theo **dung lượng đã cấp phát**, không theo dung lượng thực sự sử dụng:

- **$0.15 mỗi GiB-tháng.**
- Một tháng là 730 giờ, nên giá theo giờ là $0.15 / 730 ≈ **$0.00020548 mỗi GiB-giờ**.
- Mức sử dụng được đo mỗi giờ, chính xác tới từng giây, từ khi ổ đĩa được tạo tới khi bị xóa.
- Phí lưu trữ **tiếp tục tính khi ổ đĩa còn tồn tại, kể cả khi ứng dụng đang dừng hoặc ngủ**. Xóa ổ đĩa để dừng phí lưu trữ.

| Dung lượng | Mỗi tháng (730 giờ) |
|-----------|---------------------|
| 10 GiB | $1.50 |
| 30 GiB | $4.50 |
| 100 GiB | $15.00 |

Thời gian không đủ tháng được tính theo tỷ lệ. Ví dụ, ổ 30 GiB giữ trong 360 giờ có giá 30 × 360 × $0.15 / 730 ≈ $2.22.

### Số tiền dưới 1 cent {#sub-cent-amounts}

Phí lưu trữ mỗi giờ của ổ đĩa nhỏ chỉ là một phần của cent. TOSE không làm tròn từng giờ: số tiền chính xác được cộng dồn sang kỳ sau và chỉ trừ vào ví khi đủ một cent. Tính cả tháng, bạn trả đúng mức giá ở trên.

### Snapshot {#snapshots}

Không có phí snapshot. Hiện chưa hỗ trợ snapshot ổ đĩa.

## Cloud Harness {#cloud-harness}

Instance [Cloud Harness](/vi/guide/cloud-harness) không có phí mở khóa. Instance được tính phí theo
ba phần, theo giá compute và giá lưu trữ ở trên:

| Phần | Cách tính phí | Kích thước |
|------|---------------|------------|
| Instance | Mỗi giờ khi instance đang chạy, giống các template khác | Kích thước bạn chọn, cộng phần tài nguyên cố định cho các container chạy cạnh runner |
| Docker host | **Theo giây khi đang thức**; **$0 khi đang nghỉ (cold)** | Kích thước docker host của bản cài đặt |
| Ổ đĩa | Chừng nào instance còn tồn tại, kể cả khi đang dừng | Ổ đĩa trạng thái của instance cộng ổ đĩa của docker host |

- **Instance:** (vCPU + vCPU dành riêng) × giá CPU + (GB + GB dành riêng) × giá RAM, làm tròn tới
  cent mỗi giờ. Instance đang dừng không tính phí compute.
- **Docker host:** vCPU của nó × giá CPU + GB của nó × giá RAM, theo giờ, tính cho từng giây từ khi
  xác nhận đã khởi động tới khi xác nhận đã dừng. Docker host thức dậy khi một job cần Docker và tạm
  dừng khi rảnh. Số tiền dưới 1 cent được cộng dồn, như mô tả ở mục
  [Số tiền dưới 1 cent](#sub-cent-amounts).
- **Ổ đĩa:** tổng dung lượng đã cấp phát (GiB) của cả hai ổ đĩa, theo giá lưu trữ.

Giá hiện hành do server tính và trả về trong khối `pricing` của mục `cloudharness` trong danh mục
template (`GET /api/workspaces/available-templates`); dashboard hiển thị các giá này trên thẻ Cloud
Harness:

| Trường | Ý nghĩa |
|--------|---------|
| `instance.cpu`, `instance.ram` | Kích thước mặc định của instance |
| `instance.reserved_cpu`, `instance.reserved_ram` | Phần tài nguyên cố định cho các container chạy cạnh runner |
| `instance.usd_per_hour` | Giá instance mỗi giờ khi đang chạy |
| `docker_host.cpu`, `docker_host.ram` | Kích thước docker host |
| `docker_host.usd_per_hour_running` | Giá docker host mỗi giờ khi đang thức |
| `docker_host.usd_per_hour_cold` | Luôn là `0` |
| `storage.state_disk_gib`, `storage.runtime_disk_gib` | Dung lượng các ổ đĩa |
| `storage.usd_per_month` | Giá cả hai ổ đĩa mỗi tháng |

Giá dùng mức compute tiêu chuẩn, nên danh mục không còn liệt kê giá theo từng bậc số dư ví.

**Giới hạn số instance.** Mỗi workspace chỉ chứa được một số lượng instance Cloud Harness giới hạn:
mặc định là 5, trừ khi bản cài đặt TOSE của bạn đặt giới hạn khác. Trường `max_instances` trong danh
mục hiển thị giới hạn này. Instance đang bị xóa vẫn được tính cho đến khi docker host của nó được
xóa xong.

Tạo instance và đánh thức docker host của nó đều cần số dư ví lớn hơn 0.

## Khi số dư bằng 0 {#when-the-balance-is-zero}

TOSE từ chối mọi deploy khi số dư ví của workspace bằng 0 hoặc âm. Bạn thấy gì tuỳ vào nơi bắt đầu deploy:

| Nơi bắt đầu | Điều xảy ra |
|-------------|-------------|
| Dashboard và API | Deploy, redeploy và rollback trả HTTP `402` với mã lỗi `INSUFFICIENT_BALANCE`. Không tạo deployment. Xem [Thông báo lỗi thường gặp](/guide/troubleshooting#insufficient-balance). |
| Push GitHub và lần deploy đầu của dự án | Deployment được tạo nhưng chuyển sang `failed` trước khi build, kèm thông báo `insufficient wallet balance`. |
| Agent qua MCP | `deploy_project` và `rollback_deployment` trả `INSUFFICIENT_BALANCE` ngay ở bước plan, nên bạn không bị hỏi duyệt một thay đổi không chạy được. Xem [Tasks](/vi/mcp/tasks#vi-het-tien). |

Khi ví hết tiền, TOSE vẫn tạm ngưng compute như trước. Các instance Cloud Harness đang chạy bị dừng và docker host của chúng được tạm dừng. Ổ đĩa bền vững và dữ liệu **không** bị xóa, và phí lưu trữ vẫn tiếp tục tích lũy; khoản này được trừ sau lần nạp tiền kế tiếp. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks#retention). Phần compute chưa trả được sẽ được xoá nợ, nên bạn không phải trả sau khi nạp tiền.

**Cách khắc phục:** nạp tiền vào ví ở trang billing trên dashboard, rồi deploy lại. Deploy chạy bình thường khi số dư lớn hơn 0.

Nạp tiền sẽ tự động khôi phục hầu hết template đang bị tạm ngưng. Deploy một template đang `suspended` cũng cần số dư ví dương: nếu không, deploy bị từ chối với `402 INSUFFICIENT_BALANCE` và template vẫn ở trạng thái suspended (xem [API deploy và resume template](/vi/api/template-deploy#suspended-needs-balance)).

### Instance Dewee và GoClaw sau khi nạp tiền {#suspended-gateway-templates}

Instance Dewee hoặc GoClaw chỉ tự khôi phục sau khi nạp tiền khi có gateway token còn hiệu lực: token hợp lệ được lưu, workload đang chạy đọc được token đó, và Secret biến của workload có nó. Nếu không, instance vẫn `suspended` thay vì quay lại ở trạng thái truy cập được mà không cần xác thực. Lịch sử deployment có thêm một mục `system` thất bại với mã `GATEWAY_TOKEN_*`, và chủ workspace nhận email kèm liên kết tới instance.

Để đưa instance trở lại, mở instance và chọn **Issue token and resume** (hoặc redeploy). Cần vai trò owner hoặc admin và số dư dương. Sau đó:

- client hiện có phải gửi token mới được cấp (admin workspace đọc được trong mục biến của template);
- các phiên đang hoạt động kết thúc, vì pod khởi động lại.

Thao tác tương tự có ở `POST /api/workspaces/{slug}/templates/{template_slug}/resume`; xem [API](/vi/api/template-deploy#resume) và [mã `GATEWAY_TOKEN_*`](/vi/api/template-deploy#gateway-token-codes).

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Cloud Harness](/vi/guide/cloud-harness)
- [`tose pricing` / `tose volumes`](/vi/commands/disk)
- [API ổ đĩa, volume & bảng giá](/vi/api/disks)
