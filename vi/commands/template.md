# tose template

Tạo và chạy template 1-click (GoClaw, Multix) từ dòng lệnh.

Mọi lệnh đều nhận `--json`.

## Bắt đầu nhanh

```bash
tose template catalog                                  # key, tài nguyên, dung lượng, phí TOSE ước tính
tose template create demo --template multix --json     # --type là bí danh; mặc định là goclaw
tose template env set demo --env-file provider.env     # file phải ở chế độ chmod 600
printf 'GEMINI_API_KEY=%s\n' "$KEY" | tose template env set demo --env-stdin
tose template env set demo GEMINI_API_KEY              # chỉ có tên key: nhập giá trị ở prompt ẩn trong terminal
tose template deploy demo --wait --json                # chờ xong, rồi trả về các liên kết do API báo
tose template resume demo --wait --json                # cấp token và resume instance Dewee/GoClaw đang bị suspend
```

## tose template catalog

Liệt kê các template có thể tạo. Mỗi mục hiển thị key, cổng, CPU và RAM. Dung lượng lưu trữ, tên các thông tin đăng nhập được sinh ra (không bao giờ in giá trị), trạng thái trả phí hoặc đã mở khóa và phí TOSE ước tính chỉ hiển thị khi API gửi về.

```bash
tose template catalog
```

## tose template create

Tạo một instance template.

### Tóm tắt {#tose-template-create-synopsis}

```bash
tose template create [name] [--template <key>]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--template <key>` | Key template lấy từ `tose template catalog`. Mặc định: `goclaw` |
| `--type <key>` | Bí danh của `--template` |

- Key được kiểm tra với catalog hiện hành. Key không tồn tại sẽ thoát với mã `2` và không tạo gì cả.
- Không có `--template` thì dùng `goclaw`. Trong terminal, CLI cho bạn chọn từ catalog.
- Trong output ở terminal, khi catalog cung cấp thông tin, CLI nêu rõ việc dùng nhà cung cấp AI là [BYOK](#su-dung-nha-cung-cap-ai-byok), không tính vào ví, và hiển thị phí TOSE ước tính. Nếu bỏ qua tên, CLI hỏi trong terminal.

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
| `--env-file <path>` | Đọc các dòng `KEY=VALUE` từ file. CLI từ chối file mà group hoặc người khác truy cập được, nên hãy dùng `chmod 600`. Windows không bị kiểm tra bước này |
| `--env-stdin` | Đọc các dòng `KEY=VALUE` từ standard input, ví dụ từ kho secret |
| Chỉ có tên key (`<KEY>`) | Hỏi giá trị ở prompt ẩn. Bị từ chối nếu không có terminal, hoặc khi dùng `--json` / `--non-interactive` (mã `2`, `INPUT_REQUIRED`) |

`KEY=VALUE` viết thẳng trên dòng lệnh vẫn dùng được, nhưng chỉ nên dùng cho cấu hình không phải secret. CLI in cảnh báo vì giá trị sẽ nằm trong lịch sử shell và danh sách tiến trình.

- Giá trị bạn nhập được che trong thông báo lỗi và trong output `--json`.
- `tose template env list` không bao giờ in giá trị secret.

### Biến nào là secret {#bien-nao-la-secret}

Cờ `is_secret` bạn gửi chỉ là một đề nghị, không phải bảo đảm. Server là bên quyết định và có thể ép cờ này thành `true`:

- Key chứa `dsn`, `encryption_key` hoặc `connection_string` luôn được lưu là secret, kể cả khi client gửi `is_secret: false`. Việc so khớp không phân biệt hoa thường và coi `-`, `.`, khoảng trắng như `_`, nên `DATABASE_DSN` và `app-encryption-key` đều khớp.
- Key nằm trong `required_envs` của template trong catalog luôn được lưu là secret.
- Server che các giá trị này (`***`) khi liệt kê biến. Khi server khởi động với hành vi này, một migration cũng đánh dấu các hàng đã lưu là không-secret từ trước.

Phản hồi của `env list` luôn trả `is_secret` hiệu lực, vì vậy hãy đọc lại thay vì giả định cờ bạn đã gửi.

### Ai đọc được giá trị

| Role trong workspace | Liệt kê (`env list`, `GET .../envs`) | Reveal một giá trị (`GET .../envs/{key}/reveal`) |
|----------------------|--------------------------------------|--------------------------------------------------|
| `member` | Chỉ thấy key. Mọi giá trị hiện `***` | Không được phép |
| `admin`, `owner` | Giá trị không-secret hiện rõ. Giá trị secret hiện `***` | Được phép |

Thay đổi biến (`set`, `rm`) cũng cần `admin` hoặc `owner`.

`tose template env set` từ chối giá trị là placeholder đã che (`***` hoặc `********`) và không gửi gì (`VALIDATION_ERROR`, mã thoát `2`), nên danh sách đã sao chép không thể ghi đè giá trị thật. Xem thêm [Giá trị bị che với member của workspace](/vi/guide/environment#gia-tri-bi-che-voi-member-cua-workspace).

### Sửa một secret

Trên dashboard, form sửa hiển thị giá trị của secret để trống. Để trống ô và lưu thì giữ nguyên giá trị đã lưu. Nhập giá trị mới thì thay thế. Qua API và CLI không có cách tắt "giữ nguyên": `POST .../envs` với `value` rỗng sẽ lưu giá trị rỗng, vì vậy chỉ gửi những key bạn muốn đổi.

## tose template info

Hiển thị một instance template, các liên kết và phiên bản image của nó.

```bash
tose template info <slug>
```

Khối `Image:` hiển thị:

| Dòng | Ý nghĩa |
|------|---------|
| `Deployed` | Image của lần deploy gần nhất, hoặc `none yet` |
| `Configured` | Image đã lưu trên template. Đây là image `--mode image` chạy, và là giá trị mà `--expected-image` so sánh |
| `Source` | Nguồn của image đã lưu, khi API có báo |
| `Available` | Phiên bản của catalog, hoặc `no catalog version` |

Khi phiên bản catalog khác image đã cấu hình, CLI báo có bản cập nhật và in lệnh `--upgrade`. CLI cũng in lưu ý về rollback mà API gửi. Với `--json`, cùng dữ liệu nằm ở `data.image`.

## tose template deploy

Deploy một instance template.

### Tóm tắt {#tose-template-deploy-synopsis}

```bash
tose template deploy <slug> [--mode <mode>] [--upgrade | --rollback <deployment_id>] [--expected-image <image>] [--wait] [--timeout <duration>]
```

### Tùy chọn

| Tùy chọn | Mô tả |
|----------|-------|
| `--mode <mode>` | `image` hoặc `build`. Mặc định: `image` |
| `--upgrade` | Chuyển sang phiên bản catalog. Gửi `image_source=catalog` và lưu image đó |
| `--rollback <deployment_id>` | Chạy lại image của một lần deploy trước và lưu image đó, nên các lần deploy sau tiếp tục chạy nó cho đến khi bạn dùng `--upgrade` hoặc đặt image mới. Hỏi xác nhận; không có terminal, hoặc khi dùng `--json` hay `--non-interactive`, thì cần `--yes` (nếu không sẽ thoát với mã `4`) |
| `--expected-image <image>` | Thất bại với conflict, không deploy gì, nếu image đã cấu hình không còn là image này. Sao chép từ dòng `Configured:` của `tose template info` |
| `--wait` | Thăm dò cho đến khi rollout kết thúc |
| `--timeout <duration>` | Thời gian tối đa của `--wait`, ví dụ `90s` hoặc `15m`. Mặc định: `15m` |

- `--upgrade`, `--rollback` và `--expected-image` cần `--mode image`. Dùng cùng `--mode build` thì lệnh thoát với mã `2` và không thay đổi gì.
- Không thể kết hợp `--upgrade` với `--rollback`.
- `--rollback` nhận ID của một lần deploy của template này đã chạy, ví dụ dòng `Deployment ID:` do một lần `tose template deploy` trước in ra, hoặc danh sách trong [API template](/vi/api/templates#deployments). ID rỗng bị từ chối.
- Template Cloud Harness không có image để chạy hay rollback. `--upgrade`, `--rollback` và `--expected-image` bị từ chối với `400` và không có gì được deploy; hãy dùng `tose template deploy` thường. Với template khác, nếu API không áp dụng một tùy chọn, CLI báo lỗi nêu tên tùy chọn và lần deploy đã được khởi chạy, thay vì nói tùy chọn đã hoạt động.
- Cảnh báo từ API được in ra. Với `--json` chúng nằm ở `data.warnings`.

```bash
tose template info demo                                        # ghi lại image ở dòng Configured:
tose template deploy demo --upgrade --expected-image registry.example.com/app:1.4.0 --wait
tose template deploy demo --rollback <deployment_id> --yes --wait
```

### Image nào được chạy

`--mode image` chạy image đã lưu trên template. Một lần deploy thông thường không thay nó bằng image mặc định của catalog, và mọi template có từ trước hành vi này đều được coi là custom, nên không có gì được nâng cấp ngầm. Template tạo từ catalog bắt đầu với image của catalog đã được lưu. Khi catalog có phiên bản khác, API báo trong `warnings` và `tose template info` hiển thị đó là bản cập nhật khả dụng. Dùng `--upgrade` để chuyển sang. Các tùy chọn tương ứng trong [API template](/vi/api/templates#deploy-template) là `image_source=catalog`, `rollback_to` và `expected_image`.

::: warning Rollback không hoàn tác dữ liệu của bạn
`--rollback` chạy lại một image cũ hơn. Nó **không** rollback schema hay dữ liệu của database. Nếu phiên bản mới đã migrate chúng, image cũ có thể lỗi hoặc đọc sai. Hãy khôi phục bản sao lưu cùng với image cũ.
:::

### Mã thoát khi dùng `--wait` {#ma-thoat-khi-dung-wait}

| Mã | Ý nghĩa |
|----|---------|
| `0` | Rollout hoàn tất |
| `8` | Rollout thất bại, bị hủy hoặc bị chấm dứt |
| `7` | Hết thời gian chờ. Rollout vẫn có thể hoàn tất trên server |

### Liên kết và secret

- Các liên kết dashboard, MCP, API và docs lấy từ phản hồi của API. CLI không tự ghép chúng từ slug.
- Thông tin đăng nhập được sinh ra và bootstrap secret dùng một lần không bao giờ được in. Hãy mở liên kết dashboard và hoàn tất đăng nhập bootstrap ở đó.
- Thiếu số dư ví, thiếu domain TLS hoặc cấp ổ đĩa thất bại đều được báo kèm bước cần làm tiếp theo.

## tose template resume

Cấp gateway token và resume một instance Dewee/GoClaw đang bị suspend. Dùng khi billing đã resume template nhưng không để lại gateway token còn hiệu lực.

### Tóm tắt {#tose-template-resume-synopsis}

```bash
tose template resume <slug> [--wait] [--timeout <duration>]
```

- Cần cùng vai trò workspace như `tose template deploy`.
- Template không có gateway trả `400`. Với chúng, hãy dùng [`tose template deploy`](#tose-template-deploy).
- `--wait` và `--timeout` hoạt động như ở `deploy`, gồm cả [mã thoát](#ma-thoat-khi-dung-wait).

::: warning Client phải chuyển sang token mới
Sau khi resume, client phải dùng gateway token mới và các phiên hiện có sẽ kết thúc. CLI in cảnh báo này, và với `--json` nó cũng nằm trong `warnings`. Nếu một lần resume đã được chấp nhận nhưng thất bại khi đang chờ, cảnh báo tương tự nằm trong chi tiết lỗi.
:::

```bash
tose template resume demo --wait --json
```

## Template đang bị suspend {#template-dang-bi-suspend}

Template đang bị suspend từ chối `deploy` và `resume` khi ví hết tiền. Các lần từ chối này được báo bằng mã ổn định:

| Phản hồi | Kết quả ở CLI |
|----------|---------------|
| `402 INSUFFICIENT_BALANCE` | Thoát với mã `9`. Liên kết billing là một next action, và template vẫn ở trạng thái suspended. Hãy nạp tiền rồi chạy lại lệnh |
| `409` do request chạy đua với việc suspend | `retryable`. Chưa có gì được khởi động. Lệnh thử lại là một next action và giữ nguyên các flag của bạn, trừ thông tin xác thực (`--api-key`) và `--yes` |
| `409` vì đã có deployment đang chạy | Không retry được. Next action là [`tose template info`](#tose-template-info) |
| `409` khi resume một template không bị suspend | Không retry được. Next action là [`tose template deploy`](#tose-template-deploy) |

## Sử dụng nhà cung cấp AI (BYOK) {#su-dung-nha-cung-cap-ai-byok}

Template gọi nhà cung cấp AI (Gemini, OpenAI và các nhà cung cấp khác) dùng key riêng của bạn. Nhà cung cấp tính phí phần sử dụng đó. Ví TOSE chỉ bị trừ phần hạ tầng, tức là phí TOSE ước tính hiển thị bởi `tose template catalog`.

## Liên quan

- [API template](/vi/api/templates)
- [Biến môi trường](/vi/guide/environment)
- [Bảng giá](/vi/guide/pricing)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Runbook template Dewee](/vi/guide/dewee-template)
