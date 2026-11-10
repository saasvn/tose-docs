# tose disk / volumes / pricing

Quản lý [ổ đĩa bền vững](/vi/guide/persistent-disks) và xem [bảng giá](/vi/guide/pricing).

Mọi lệnh đều nhận các tùy chọn toàn cục (xem [Tổng quan](/vi/commands/overview)), bao gồm `--json`.

## tose disk get

Hiển thị ổ đĩa của dự án, hoặc cho biết dự án đang stateless.

### Tóm tắt {#tose-disk-get-synopsis}

```bash
tose disk get [project]
```

`[project]`: slug dự án hoặc `workspace/project`. Mặc định là dự án đang liên kết.

---

## tose disk set

Thêm ổ đĩa cho dự án, tăng dung lượng hoặc đổi đường dẫn mount. Cần quyền admin của workspace.

### Tóm tắt {#tose-disk-set-synopsis}

```bash
tose disk set [project] --size <gib> [--mount <path>]
```

| Tùy chọn | Mô tả |
|--------|-------------|
| `--size <gib>` | Dung lượng tính bằng GiB, 1–1000. Chỉ được tăng |
| `--mount <path>` | Đường dẫn mount tuyệt đối trong container, ví dụ `/data`. Bắt buộc khi tạo ổ đĩa; khi tăng dung lượng có thể bỏ qua để giữ đường dẫn hiện tại |

Quy tắc đường dẫn mount xem tại [Ổ đĩa bền vững](/vi/guide/persistent-disks#mount-path).

```bash
# Bật ổ đĩa 10 GiB tại /data
tose disk set --size 10 --mount /data

# Tăng dung lượng sau đó
tose disk set --size 30

# Áp dụng thay đổi
tose redeploy
```

Thay đổi có hiệu lực ở lần triển khai tiếp theo. Khi dự án có ổ đĩa, nó chỉ chạy một replica và mỗi lần triển khai lại sẽ gián đoạn ngắn.

---

## tose disk delete

Xóa ổ đĩa của dự án cùng **toàn bộ dữ liệu** trên đó và dừng tính phí lưu trữ. Cần quyền admin của workspace.

### Tóm tắt {#tose-disk-delete-synopsis}

```bash
tose disk delete [project] --confirm <project_slug>
```

| Tùy chọn | Mô tả |
|--------|-------------|
| `--confirm <project_slug>` | Bắt buộc. Phải trùng với slug của dự án |

`--yes` không bỏ qua bước xác nhận này.

```bash
tose disk delete --confirm my-app
```

---

## tose volumes list

Liệt kê mọi ổ đĩa trong workspace: ổ đĩa dự án, ổ đĩa template và dung lượng cơ sở dữ liệu được quản lý, kèm dung lượng, trạng thái và chi phí hàng tháng.

### Tóm tắt {#tose-volumes-list-synopsis}

```bash
tose volumes list
```

---

## tose volumes resize

Tăng dung lượng bất kỳ ổ đĩa nào trong workspace theo volume ID (lấy từ `tose volumes list`). Cần quyền admin của workspace.

### Tóm tắt {#tose-volumes-resize-synopsis}

```bash
tose volumes resize <volume_id> --size <gib>
```

| Tùy chọn | Mô tả |
|--------|-------------|
| `--size <gib>` | Dung lượng mới tính bằng GiB. Phải lớn hơn dung lượng hiện tại |

Không thể giảm dung lượng; xem [Thay đổi dung lượng](/vi/guide/persistent-disks#resizing).

---

## tose pricing

Hiển thị mức giá compute tiêu chuẩn và giá lưu trữ hiện hành, lấy từ [`GET /api/pricing`](/vi/api/disks#get-pricing).

### Tóm tắt {#tose-pricing-synopsis}

```bash
tose pricing
```

## Liên quan {#related}

- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Bảng giá](/vi/guide/pricing)
- [API ổ đĩa, volume & bảng giá](/vi/api/disks)
