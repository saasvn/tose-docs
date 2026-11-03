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

## Khi số dư bằng 0 {#when-the-balance-is-zero}

TOSE từ chối mọi deploy khi số dư ví của workspace bằng 0 hoặc âm. Bạn thấy gì tuỳ vào nơi bắt đầu deploy:

| Nơi bắt đầu | Điều xảy ra |
|-------------|-------------|
| Dashboard và API | Deploy, redeploy và rollback trả HTTP `402` với mã lỗi `INSUFFICIENT_BALANCE`. Không tạo deployment. Xem [Thông báo lỗi thường gặp](/guide/troubleshooting#insufficient-balance). |
| Push GitHub và lần deploy đầu của dự án | Deployment được tạo nhưng chuyển sang `failed` trước khi build, kèm thông báo `insufficient wallet balance`. |
| Agent qua MCP | `deploy_project` và `rollback_deployment` trả `INSUFFICIENT_BALANCE` ngay ở bước plan, nên bạn không bị hỏi duyệt một thay đổi không chạy được. Xem [Tasks](/vi/mcp/tasks#vi-het-tien). |

Khi ví hết tiền, TOSE vẫn tạm ngưng compute như trước. Ổ đĩa bền vững và dữ liệu **không** bị xóa, và phí lưu trữ vẫn tiếp tục tích lũy; khoản này được trừ sau lần nạp tiền kế tiếp. Xem [Ổ đĩa bền vững](/vi/guide/persistent-disks#retention). Phần compute chưa trả được sẽ được xoá nợ, nên bạn không phải trả sau khi nạp tiền.

**Cách khắc phục:** nạp tiền vào ví ở trang billing trên dashboard, rồi deploy lại. Deploy chạy bình thường khi số dư lớn hơn 0.

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [`tose pricing` / `tose volumes`](/vi/commands/disk)
- [API ổ đĩa, volume & bảng giá](/vi/api/disks)
