# Bảng giá

TOSE tính phí theo mức sử dụng thực tế, trừ trực tiếp vào ví của workspace. Bạn trả cho hai thứ:

- **Compute** (CPU và RAM) khi workload đang chạy.
- **Lưu trữ** cho ổ đĩa bền vững khi ổ đĩa còn tồn tại.

Mức giá hiện hành luôn có tại [`tose pricing`](/vi/commands/disk#tose-pricing) hoặc endpoint công khai [`GET /api/pricing`](/vi/api/disks#get-pricing). Nếu trang này và API khác nhau, API là nguồn chuẩn.

## Compute {#compute}

Compute được tính theo giờ cho CPU và RAM cấp cho workload đang chạy. Mức giá phụ thuộc số dư ví:

| Số dư ví | CPU (mỗi vCPU-giờ) | RAM (mỗi GB-giờ) |
|----------|--------------------|------------------|
| Dưới $100 | $0.02 | $0.01 |
| Từ $100 | $0.014 | $0.007 |
| Từ $200 | $0.012 | $0.006 |

Compute **chỉ tính phí khi workload đang chạy**. Dừng dự án (`tose down`), ngủ hoặc bị tạm ngưng sẽ dừng tính phí compute.

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
| `compute_tiers` | Giá instance và docker host cho từng bậc số dư ví |

Các giá theo giờ nằm ngoài `compute_tiers` áp dụng cho bậc số dư thấp nhất.

**Giới hạn số instance.** Mỗi workspace chỉ chứa được một số lượng instance Cloud Harness giới hạn:
mặc định là 5, trừ khi bản cài đặt TOSE của bạn đặt giới hạn khác. Trường `max_instances` trong danh
mục hiển thị giới hạn này. Instance đang bị xóa vẫn được tính cho đến khi docker host của nó được
xóa xong.

Tạo instance và đánh thức docker host của nó đều cần số dư ví lớn hơn 0.

## Job CI {#ci-jobs}

::: info Tình trạng
TOSE CI chưa được phát hành rộng rãi. Mục này mô tả cách tính phí job khi CI được bật cho workspace của bạn.
:::

Job CI được trừ vào ví của workspace theo giá [compute](#compute) cơ bản, 2.0 cent mỗi vCPU-giờ và 1.0 cent mỗi GiB-giờ bộ nhớ đã dành riêng, tính theo số giây container của job chạy. Chỉ trả trước: job bị từ chối trước khi chạy nếu trường hợp xấu nhất (CPU và bộ nhớ yêu cầu trong toàn bộ thời gian timeout), cộng với trường hợp xấu nhất của các job khác đang chạy trong workspace, vượt quá số dư sau khi trừ phần sử dụng chưa tính phí và phần cộng dồn CI bên dưới.

- **Cộng dồn dưới 1 cent.** Mỗi job bị trừ theo số cent nguyên. Phần lẻ của một cent được cộng dồn vào một khoản CI riêng trên ví và chỉ bị trừ khi đủ một cent, nên job ngắn không được miễn phí chỉ vì chi phí dưới 1 cent. Ví dụ, job dùng 1 vCPU và 2 GiB chạy khoảng 10 phút có chi phí khoảng 0.667 cent: một job như vậy chưa bị trừ gì, và hai job như vậy cộng lại bị trừ 1 cent.
- **Không bao giờ vượt số dư.** Job không bao giờ bị trừ quá số dư ví. Phần compute mà số dư không trả được sẽ được xóa nợ, không bị ghi thành nợ.
- **Xóa khi về 0.** Khi số dư ví về 0, bởi bất kỳ khoản trừ nào, khoản cộng dồn CI bị xóa. Khoản này không bao giờ bị thu sau khi nạp tiền.
- **Một giao dịch mỗi job.** Job bị trừ ít nhất một cent ghi một giao dịch ví `usage` với loại tham chiếu `ci_job`; job không bị trừ gì thì không ghi giao dịch. Việc tính phí job là idempotent, nên thử lại không bao giờ trừ tiền hai lần.

## Khi số dư bằng 0 {#when-the-balance-is-zero}

TOSE từ chối mọi deploy khi số dư ví của workspace bằng 0 hoặc âm. Bạn thấy gì tuỳ vào nơi bắt đầu deploy:

| Nơi bắt đầu | Điều xảy ra |
|-------------|-------------|
| Dashboard và API | Deploy, redeploy và rollback trả HTTP `402` với mã lỗi `INSUFFICIENT_BALANCE`. Không tạo deployment. Xem [Thông báo lỗi thường gặp](/guide/troubleshooting#insufficient-balance). |
| Push GitHub và lần deploy đầu của dự án | Deployment được tạo nhưng chuyển sang `failed` trước khi build, kèm thông báo `insufficient wallet balance`. |
| Agent qua MCP | `deploy_project` và `rollback_deployment` trả `INSUFFICIENT_BALANCE` ngay ở bước plan, nên bạn không bị hỏi duyệt một thay đổi không chạy được. Xem [Tasks](/vi/mcp/tasks#vi-het-tien). |

Khi ví hết tiền, TOSE vẫn tạm ngưng compute như trước. Các instance Cloud Harness đang chạy bị dừng và docker host của chúng được tạm dừng. Ổ đĩa bền vững và dữ liệu **không** bị xóa, và phí lưu trữ vẫn tiếp tục tích lũy; khoản này được trừ sau lần nạp tiền kế tiếp. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks#retention). Phần compute chưa trả được sẽ được xoá nợ, nên bạn không phải trả sau khi nạp tiền.

**Cách khắc phục:** nạp tiền vào ví ở **Ví & thanh toán** trên dashboard (nhóm **Workspace**), rồi deploy lại. Deploy chạy bình thường khi số dư lớn hơn 0.

Nạp tiền sẽ tự động khôi phục hầu hết template đang bị tạm ngưng. Deploy một template đang `suspended` cũng cần số dư ví dương: nếu không, deploy bị từ chối với `402 INSUFFICIENT_BALANCE` và template vẫn ở trạng thái suspended (xem [API deploy và resume template](/vi/api/template-deploy#suspended-needs-balance)).

### Instance Dewee và GoClaw sau khi nạp tiền {#suspended-gateway-templates}

Instance Dewee hoặc GoClaw chỉ tự khôi phục sau khi nạp tiền khi có gateway token còn hiệu lực: token hợp lệ được lưu, workload đang chạy đọc được token đó, và Secret biến của workload có nó. Nếu không, instance vẫn `suspended` thay vì quay lại ở trạng thái truy cập được mà không cần xác thực. Lịch sử deployment có thêm một mục `system` thất bại với mã `GATEWAY_TOKEN_*`, và chủ workspace nhận email kèm liên kết tới instance.

Để đưa instance trở lại, mở instance và chọn **Issue token and resume** (hoặc redeploy). Cần vai trò owner hoặc admin và số dư dương. Sau đó:

- client hiện có phải gửi token mới được cấp (admin workspace đọc được trong mục biến của template);
- các phiên đang hoạt động kết thúc, vì pod khởi động lại.

Thao tác tương tự có ở `POST /api/workspaces/{slug}/templates/{template_slug}/resume`; xem [API](/vi/api/template-deploy#resume) và [mã `GATEWAY_TOKEN_*`](/vi/api/template-deploy#gateway-token-codes).

## Mã khuyến mãi {#promo-codes}

Mã khuyến mãi giảm số tiền nạp ví hoặc cộng credit thưởng. Credit thưởng được trừ trước. Xem [Mã khuyến mãi và credit thưởng](/vi/guide/promo-codes).

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Mã khuyến mãi và credit thưởng](/vi/guide/promo-codes)
- [Cloud Harness](/vi/guide/cloud-harness)
- [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing)
- [`tose pricing` / `tose volumes`](/vi/commands/disk)
- [API ổ đĩa, volume & bảng giá](/vi/api/disks)
