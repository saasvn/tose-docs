# tose template

Tạo và chạy template 1-click (GoClaw, Multix) từ dòng lệnh.

Mọi lệnh đều nhận các tùy chọn toàn cục (xem [Tổng quan](/vi/commands/overview)), bao gồm `--json`.

## Bắt đầu nhanh

```bash
tose template catalog                                  # key, tài nguyên, dung lượng, phí TOSE ước tính
tose template create demo --template multix --json     # --type là bí danh; mặc định là goclaw
tose template env set demo --env-file provider.env     # file phải ở chế độ chmod 600
printf 'GEMINI_API_KEY=%s\n' "$KEY" | tose template env set demo --env-stdin
tose template env set demo GEMINI_API_KEY              # chỉ có tên key: nhập giá trị ở prompt ẩn trong terminal
tose template deploy demo --wait --json                # chờ xong, rồi trả về các liên kết do API báo
```

## tose template catalog

Liệt kê các template có thể tạo. Mỗi mục hiển thị key, cổng, CPU và RAM, dung lượng lưu trữ, template có sinh thông tin đăng nhập hay không (chỉ báo có hay không, không bao giờ in giá trị), trạng thái trả phí hoặc đã mở khóa, và phí TOSE ước tính. Trường nào API không gửi thì không hiển thị.

```bash
tose template catalog
```

## tose template create

Tạo một instance template.

### Tóm tắt {#tose-template-create-synopsis}

```bash
tose template create <name> [--template <key>]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--template <key>` | Key template lấy từ `tose template catalog`. Mặc định: `goclaw` |
| `--type <key>` | Bí danh của `--template` |

- Key được kiểm tra với catalog hiện hành. Key không tồn tại sẽ thoát với mã `2` và không tạo gì cả.
- Không có `--template` thì dùng `goclaw`. Trong terminal, CLI cho bạn chọn từ catalog.
- Kết quả nêu rõ việc dùng nhà cung cấp AI là [BYOK](#su-dung-nha-cung-cap-ai-byok) và không tính vào ví.

## tose template env

Quản lý biến môi trường của một instance template.

### Tóm tắt {#tose-template-env-synopsis}

```bash
tose template env set <slug> --env-file <path>
tose template env set <slug> --env-stdin
tose template env set <slug> <KEY>
tose template env set <slug> <KEY=VALUE>
tose template env list <slug>
tose template env rm <slug> <keys...> --yes
```

### Nhập secret an toàn

Dùng một trong các cách sau cho API key và các secret khác:

| Cách | Hành vi |
|------|---------|
| `--env-file <path>` | Đọc các dòng `KEY=VALUE` từ file. CLI từ chối file nếu không phải `chmod 600` (group hoặc người khác đọc được) |
| `--env-stdin` | Đọc các dòng `KEY=VALUE` từ standard input, ví dụ từ kho secret |
| Chỉ có tên key (`<KEY>`) | Hỏi giá trị ở prompt ẩn. Bị từ chối nếu không có terminal |

`KEY=VALUE` viết thẳng trên dòng lệnh vẫn dùng được, nhưng chỉ nên dùng cho cấu hình không phải secret. CLI in cảnh báo vì giá trị sẽ nằm trong lịch sử shell và danh sách tiến trình.

- Giá trị bạn nhập được che trong thông báo lỗi và trong output `--json`.
- `tose template env list` không bao giờ in giá trị secret.

## tose template deploy

Deploy một instance template.

### Tóm tắt {#tose-template-deploy-synopsis}

```bash
tose template deploy <slug> [--wait] [--timeout <duration>]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--wait` | Thăm dò cho đến khi rollout kết thúc |
| `--timeout <duration>` | Thời gian tối đa của `--wait`, ví dụ `90s` hoặc `15m`. Mặc định: `15m` |

### Mã thoát khi dùng `--wait`

| Mã | Ý nghĩa |
|----|---------|
| `0` | Rollout hoàn tất |
| `8` | Rollout thất bại hoặc bị chấm dứt |
| `7` | Hết thời gian chờ. Rollout vẫn có thể hoàn tất trên server |

Danh sách đầy đủ ở phần mã thoát trong [Tổng quan](/vi/commands/overview).

### Liên kết và secret

- Các liên kết dashboard, MCP, API và docs lấy từ phản hồi của API. CLI không tự ghép chúng từ slug.
- Thông tin đăng nhập được sinh ra và bootstrap secret dùng một lần không bao giờ được in. Hãy mở liên kết dashboard và hoàn tất đăng nhập bootstrap ở đó.
- Thiếu số dư ví, thiếu domain TLS hoặc cấp ổ đĩa thất bại đều được báo kèm bước cần làm tiếp theo.

## Sử dụng nhà cung cấp AI (BYOK) {#su-dung-nha-cung-cap-ai-byok}

Template gọi nhà cung cấp AI (Gemini, OpenAI và các nhà cung cấp khác) dùng key riêng của bạn. Nhà cung cấp tính phí phần sử dụng đó. Ví TOSE chỉ bị trừ phần hạ tầng, tức là phí TOSE ước tính hiển thị bởi `tose template catalog` và `tose template create`.

## Liên quan

- [Biến môi trường](/vi/guide/environment)
- [Bảng giá](/vi/guide/pricing)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
