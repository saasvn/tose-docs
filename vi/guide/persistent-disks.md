# Ổ đĩa bền vững

Mặc định mọi dự án TOSE đều **không trạng thái (stateless)**: hệ thống file của container được tạo lại mỗi lần triển khai, khởi động lại, dừng hoặc đánh thức, và mọi thứ ghi vào đó sẽ mất. Hãy lưu dữ liệu lâu dài trong [cơ sở dữ liệu được quản lý](/commands/db) hoặc bộ lưu trữ bên ngoài, hoặc gắn một ổ đĩa bền vững.

Ổ đĩa bền vững là một volume được mount vào container của dự án tại đường dẫn bạn chọn. Dữ liệu trên đó được giữ lại qua các lần triển khai lại, khởi động lại, dừng và ngủ.

## Khi nào nên dùng ổ đĩa {#when-to-use-a-disk}

- File upload, cache hoặc cơ sở dữ liệu nhúng (SQLite, LevelDB) cần tồn tại sau mỗi lần triển khai.
- Ứng dụng cần một thư mục dữ liệu có thể ghi, như nhiều công cụ self-host.

Nếu ứng dụng có thể lưu trạng thái trong cơ sở dữ liệu được quản lý hoặc object storage, hãy ưu tiên cách đó: dự án stateless có thể chạy nhiều replica và triển khai không gián đoạn.

## Bật ổ đĩa {#enabling-a-disk}

Ổ đĩa là tùy chọn, bật riêng cho từng dự án. Thêm khi tạo dự án hoặc sau đó:

```bash
# Khi tạo dự án (tose up nhận cùng các flag)
tose init --disk-size 10 --disk-mount /data

# Với dự án đã có
tose disk set --size 10 --mount /data
tose redeploy
```

Xem [`tose disk`](/vi/commands/disk) để biết mọi tùy chọn, hoặc [API ổ đĩa](/vi/api/disks) để thao tác qua HTTP.

### Dung lượng {#size}

- Tối thiểu **1 GiB**, tối đa **1000 GiB**, chỉ nhận số GiB nguyên.

### Đường dẫn mount {#mount-path}

Đường dẫn mount phải:

- là đường dẫn tuyệt đối (bắt đầu bằng `/`);
- không phải chính `/`;
- không chứa `..`;
- không phải, và không nằm trong, thư mục hệ thống: `/proc`, `/sys`, `/dev`, `/etc`, `/bin`, `/sbin`, `/usr`, `/lib`, `/lib32`, `/lib64`, `/boot`, `/run`, `/var/run` (ví dụ `/etc/app` cũng bị từ chối).

Lựa chọn thường gặp là `/data`, `/app/storage` hoặc `/var/lib/<app>`. Hãy đảm bảo ứng dụng ghi dữ liệu vào đúng đường dẫn đó.

## Điều gì thay đổi khi dự án có ổ đĩa {#what-changes-when-a-project-has-a-disk}

Mỗi ổ đĩa chỉ gắn được vào một container đang chạy tại một thời điểm. Vì vậy dự án có ổ đĩa:

- **chỉ chạy đúng 1 replica**; và
- **triển khai lại theo chiến lược Recreate**: container cũ dừng trước khi container mới khởi động, gây **gián đoạn ngắn** ở mỗi lần deploy, redeploy và restart.

Dự án không có ổ đĩa vẫn triển khai cuốn chiếu, không gián đoạn như bình thường.

### Lỗi cấp phát làm triển khai thất bại {#provisioning-failures-fail-the-deploy}

Nếu ổ đĩa không thể được cấp phát hoặc mount, lần triển khai sẽ **thất bại** thay vì khởi động ứng dụng mà không có lưu trữ bền vững. TOSE không bao giờ âm thầm chuyển sang hệ thống file tạm, vì ứng dụng ghi vào một ổ đĩa không tồn tại sẽ mất dữ liệu. Xem nguyên nhân bằng `tose status` và `tose logs --build`, khắc phục rồi triển khai lại.

## Thay đổi dung lượng {#resizing}

Ổ đĩa **chỉ có thể tăng dung lượng**:

```bash
tose disk set --size 30 --mount /data
tose redeploy
```

Thay đổi dung lượng hoặc đường dẫn mount có hiệu lực ở lần triển khai tiếp theo, vì vậy hãy redeploy sau đó. Ổ đĩa của template và cơ sở dữ liệu được mở rộng bằng [`tose volumes resize`](/vi/commands/disk#tose-volumes-resize).

Không thể giảm dung lượng. Để chuyển sang ổ đĩa nhỏ hơn, hãy di chuyển dữ liệu: sao chép dữ liệu ra khỏi ổ hiện tại, xóa ổ đĩa, tạo ổ mới nhỏ hơn rồi chép dữ liệu trở lại.

Chi phí tính theo dung lượng đã cấp phát; xem [Bảng giá](/vi/guide/pricing#storage).

## Xóa ổ đĩa {#deleting-a-disk}

```bash
tose disk delete --confirm my-app
```

Giá trị `--confirm` phải trùng với slug của dự án. Hãy dừng dự án trước (`tose down`): không thể xóa ổ đĩa khi ứng dụng vẫn đang chạy trên nó.

::: danger Xóa ổ đĩa sẽ xóa dữ liệu
Xóa ổ đĩa sẽ xóa vĩnh viễn mọi dữ liệu trên đó và dừng tính phí lưu trữ. Không thể hoàn tác và không có snapshot để khôi phục. Hãy sao lưu những gì bạn cần trước.
:::

## Chính sách lưu giữ {#retention}

Ổ đĩa được giữ cho tới khi bạn xóa nó, hoặc xóa dự án, template hay cơ sở dữ liệu sở hữu nó.

- **Dừng hoặc tạm ngưng** dự án (`tose down`, ngủ) sẽ dừng compute nhưng **không bao giờ xóa** ổ đĩa.
- **Hết số dư ví** chỉ tạm ngưng compute. Ổ đĩa và dữ liệu được giữ nguyên, và phí lưu trữ vẫn tiếp tục tính khi ổ đĩa còn tồn tại. Phí lưu trữ tích lũy sẽ được trừ sau lần nạp tiền kế tiếp; sau đó redeploy để tiếp tục.
- Workspace chưa từng thanh toán và chỉ dùng tiền thưởng miễn phí sẽ bị dọn dẹp sau 14 ngày hết số dư, **bao gồm cả ổ đĩa**.
- Muốn thêm hoặc tăng dung lượng ổ đĩa, số dư ví phải lớn hơn 0.

## Template và cơ sở dữ liệu được quản lý {#templates-and-managed-databases}

- **Template 1-click** mặc định có ổ đĩa **2 GiB**, nên template luôn chạy đúng 1 replica.
- **Cơ sở dữ liệu được quản lý** lưu dữ liệu trên cùng loại ổ đĩa.

Cả hai được liệt kê cùng ổ đĩa của dự án trong [`tose volumes list`](/vi/commands/disk#tose-volumes-list), mở rộng theo cùng cách (chỉ tăng) và tính phí theo cùng mức giá lưu trữ.

## Snapshot {#snapshots}

Hiện chưa hỗ trợ snapshot hoặc sao lưu ổ đĩa.

## Liên quan {#related}

- [Bảng giá](/vi/guide/pricing) - Giá compute và lưu trữ
- [`tose disk` / `tose volumes`](/vi/commands/disk) - Tham khảo CLI
- [API ổ đĩa, volume & bảng giá](/vi/api/disks) - Tham khảo REST
