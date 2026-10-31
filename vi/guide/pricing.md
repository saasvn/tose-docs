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

## Khi hết số dư {#running-out-of-balance}

Khi ví hết tiền, TOSE tạm ngưng compute. Ổ đĩa bền vững và dữ liệu **không** bị xóa; xem [Ổ đĩa bền vững](/vi/guide/persistent-disks#retention).

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [`tose pricing` / `tose volumes`](/vi/commands/disk)
- [API ổ đĩa, volume & bảng giá](/vi/api/disks)
