# Sidecar của dự án

Một dự án tiêu chuẩn có thể chạy tối đa ba **sidecar**: các container phụ chạy trong mọi pod của dự án, cạnh container chính. Ví dụ: bộ gửi metrics hoặc log, proxy cục bộ, hoặc agent nhỏ cần gọi ứng dụng qua `localhost`.

::: warning Chưa bật ở mọi nơi
Sidecar **tắt theo mặc định** và được giới hạn theo từng workspace. Tính năng có trong nền tảng không có nghĩa workspace của bạn dùng được: nếu chưa được phép, thêm sidecar sẽ bị từ chối với `403 SIDECARS_DISABLED`. Xem [Khả dụng](#availability).
:::

## Sidecar không phải dịch vụ riêng

| | Sidecar | Dịch vụ công khai riêng |
|---|---------|-------------------------|
| Chạy ở đâu | Trong mọi pod của dự án | Dự án riêng |
| Mạng | Dùng chung mạng của pod: ứng dụng gọi qua `localhost:<port>` | Service, domain và cổng riêng |
| Truy cập công khai | Không bao giờ được công khai qua Service hay domain của dự án | Có thể có domain |
| Vòng đời | Khởi động, khởi động lại và scale cùng pod của dự án | Deploy, restart, scale độc lập |

Nếu một thứ cần truy cập từ internet hoặc scale độc lập, hãy deploy nó thành dự án riêng. Một sidecar bị crash-loop khiến cả pod không ready.

## Khả dụng {#availability}

- **Chỉ dự án tiêu chuẩn.** Template và workload hardened không hỗ trợ sidecar.
- **Mặc định tắt, giới hạn theo workspace.** Nhà vận hành bật tính năng và có thể giới hạn cho một số workspace. Workspace chưa được phép không thể thêm sidecar.
- **Luôn được xoá.** Gửi `"sidecars": []` vẫn hoạt động ngay cả khi sidecar bị tắt.
- **Deploy bị từ chối, không bị cắt bớt.** Nếu dự án còn sidecar đã lưu, hoặc pod đang chạy sidecar, trong workspace không được phép, thì deploy, redeploy, deploy image hoặc rollback sẽ bị **từ chối**. TOSE không bao giờ triển khai âm thầm mà bỏ sidecar. Hãy xoá sidecar trước, hoặc nhờ bật tính năng cho workspace.
- **Slug workspace có thể được giữ chỗ.** Slug trong danh sách cho phép của nhà vận hành không thể bị workspace mới lấy, và không thể đổi tên workspace sang hoặc từ slug đó (`409`). Việc giữ chỗ vẫn có hiệu lực khi sidecar bị tắt, để tenant khác không nhận nhầm quyền khi bật lại.
- **Chưa portable.** Dự án có sidecar chưa chuyển server được: xoá sidecar, chuyển, rồi thêm lại.

## Cấu hình sidecar

Sidecar là danh sách `sidecars` khi [tạo](/vi/api/projects#sidecars) và cập nhật dự án. Mọi phản hồi dự án đều có `sidecars` (`[]` khi không có).

```json
{
  "sidecars": [
    {
      "name": "otel-collector",
      "image": "ghcr.io/acme/collector:1.4@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "registry_credential_id": "<id credential registry của workspace, cho image riêng tư>",
      "cpu": "0.25",
      "ram": "0.25",
      "port": 4318,
      "health_path": "/healthz",
      "args": ["--config=/etc/otel/config.yaml"],
      "env": [{ "name": "OTLP_HEADERS", "from_env": "OTEL_HEADERS" }],
      "disk": { "mount_path": "/data", "read_only": true }
    }
  ]
}
```

Digest ở trên là giá trị minh hoạ đúng định dạng; hãy dùng digest thật của image. `registry_credential_id` là id của một credential trong danh mục credential registry của workspace; không bao giờ đưa mật khẩu hay token registry vào request.

| Trường | Quy tắc |
|-------|------|
| `name` | 1 đến 32 chữ thường, số hoặc dấu gạch ngang, bắt đầu bằng chữ cái; duy nhất trong dự án. Đây là tên container. |
| `image` | Ghim theo digest: `registry/repository[:tag]@sha256:<64 hex>`. Image trong namespace của registry nền tảng bị từ chối (`SIDECAR_IMAGE_FORBIDDEN`). Registry phải phục vụ được manifest khi lưu sidecar. |
| `registry_credential_id` | Credential registry của workspace (`/api/workspaces/{slug}/registry-credentials`) cùng host registry. Bỏ trống để kéo ẩn danh. |
| `cpu`, `ram` | Giới hạn: số core thập phân (0,05 đến 4) và GiB (0,0625 đến 8). |
| `port` | Cổng trong pod, tuỳ chọn; khác cổng của dự án và của sidecar khác. |
| `health_path` | Khi có `port`, thêm probe HTTP startup, readiness và liveness trên đường dẫn đó. |
| `command`, `args` | Ghi đè entrypoint và tham số của image: tối đa 32 mục mỗi loại, tổng 8192 byte. |
| `run_as_user` | User id không phải root, tối thiểu 1000. Mặc định 1000. |
| `env` | Các biến duy nhất sidecar nhận được (xem [Biến môi trường](#environment-variables)). |
| `disk` | Gắn ổ đĩa bền vững của dự án (xem [Ổ đĩa](#disk)). |

### Ngữ nghĩa khi tạo và cập nhật

| Yêu cầu | Kết quả |
|---------|--------|
| Tạo, bỏ trống `sidecars` | Không có sidecar |
| Cập nhật, bỏ trống hoặc `null` | Giữ nguyên danh sách đã lưu |
| Cập nhật với `"sidecars": []` | Xoá toàn bộ sidecar |
| Cập nhật với danh sách không rỗng | Danh sách **thay thế** danh sách đã lưu; hãy gửi đủ mọi sidecar muốn giữ |

Lưu thay đổi không đụng tới workload đang chạy. Thay đổi có hiệu lực từ **lần deploy tiếp theo**.

### Biến môi trường {#environment-variables}

Sidecar không bao giờ nhận toàn bộ môi trường của dự án. Mỗi mục `env` sao chép một biến của dự án, theo tên khoá, vào biến với tên bạn chọn. Biến của dự án phải tồn tại khi lưu sidecar và khi deploy, nếu không request hoặc deploy bị từ chối với `SIDECAR_ENV_MISSING`. Xem [Biến môi trường](/vi/guide/environment).

### Ổ đĩa {#disk}

`disk.mount_path` gắn [ổ đĩa bền vững](/vi/guide/persistent-disks) của dự án. Dự án phải có ổ đĩa (`SIDECAR_DISK_MISSING`), đường dẫn phải tuyệt đối, không phải `/tmp` và không nằm dưới thư mục hệ thống. Đặt `read_only: true` khi sidecar chỉ đọc.

### Image riêng tư và credential kéo image

Với image riêng tư, truyền `registry_credential_id`, credential của workspace có cùng host với image. TOSE mã hoá credential và tạo pull secret riêng cho từng phiên bản credential.

- **Xoay vòng** có hiệu lực từ rollout tiếp theo.
- **Giữ lại:** mọi phiên bản credential được giữ tới khi workload của dự án bị xoá, để revision được giữ hoặc rollout đang chuẩn bị vẫn có credential ban đầu.
- **Xoá bản ghi trong danh mục** mà sidecar đang dùng khiến rollout tiếp theo thất bại cho đến khi bạn sửa sidecar. Việc này chỉ xoá bản sao của TOSE: **không thu hồi token tại registry.** Hãy tự thu hồi ở đó.

## TOSE bảo đảm gì

Mỗi sidecar chạy với security context cố định mà request không đổi được: không privileged, không leo thang quyền, không chạy root, bỏ mọi Linux capability, seccomp `RuntimeDefault`.

- Pod có sidecar không mount service account token, không có host path, host network hay Docker socket. Vì cài đặt token áp dụng cho cả pod, thêm sidecar cũng bỏ token khỏi container chính của dự án.
- Mỗi sidecar có `/tmp` 1 GiB và tối đa 2 GiB đĩa cục bộ.
- Image luôn được kéo lại từ registry với pull secret riêng, nên pod không dùng lại image riêng tư mà pod của tenant khác đã cache trên node.
- Pod được kiểm tra lại theo các quy tắc này trước khi áp dụng.
- Container chính của dự án luôn đứng đầu trong pod, nên exec, rollback và kiểm tra image vẫn nhắm đúng container đó.
- CPU và RAM bạn đặt là giới hạn (limit). Mức yêu cầu (request) là 0,1 core và 128 MiB, hoặc bằng giới hạn nếu giới hạn nhỏ hơn.

## Chi phí và hạn mức

Mỗi replica giữ CPU và RAM của dự án **cộng với giới hạn của các sidecar đã áp dụng**. Mức giá xem ở [trang bảng giá](/vi/guide/pricing); không lặp lại ở đây.

- **Giá dự kiến so với thu phí đã xác nhận.** Lưu thêm, sửa hoặc xoá sidecar không làm đổi hóa đơn của workload đang chạy. Giá dự kiến khi deploy dùng cấu hình đã lưu; thu phí dùng giới hạn đã xác nhận là đã áp dụng. Nếu không xác định được allocation, TOSE trả lỗi cụ thể trước khi tính bất kỳ phần nào của giờ đó cho ví. Ví cạn vẫn đình chỉ compute.
- **Báo giá khi scale dùng giới hạn đang chạy** của pod, không dùng cấu hình đã lưu.
- **Tổng cả pod.** `GET .../status` trả về giới hạn của container chính trong `resources.cpu.limit` và `resources.memory.limit`, và tổng mỗi replica gồm cả sidecar trong `pod_total`. Đây là mức được tính phí cho mỗi replica.

## Vận hành

- **Trạng thái và readiness.** `GET .../status` liệt kê mọi container của từng pod trong `pods.items[].containers` với readiness, số lần restart và state. Pod chỉ ready khi **mọi** container đều ready.
- **Log.** `GET .../logs?container=<tên>` lọc log đã lưu theo container, của container chính hoặc của sidecar. `.../live-logs` mặc định theo dõi container chính; `?container=<sidecar>` theo dõi sidecar, tên không tồn tại trả `400`. Bộ lọc áp dụng cho log gần đây và dòng lưu trữ có thông tin container. Dòng lưu trữ cũ thiếu thông tin này chỉ được trả về khi không lọc theo container.
- **Rollout thất bại.** Sidecar bị crash-loop làm rollout thất bại như container chính, và log deploy nêu tên nó. Lỗi crash chỉ được gán cho ReplicaSet khớp pod template đang triển khai, nên pod cũ dùng cùng image chính không làm hỏng một lần thay thế đổi hoặc bỏ sidecar của chúng.
- **Rollback.** Rollback qua runbook chỉ đổi image của container chính. Sidecar và pull secret của chúng được giữ nguyên.

## Xuất dự án

Bản xuất portable (`GET /api/workspaces/{slug}/projects/{project_slug}/export`, mô tả trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml)) của dự án có sidecar bị từ chối với `409 SIDECARS_NOT_PORTABLE`. Bundle v1 chỉ mô tả container chính; TOSE không âm thầm bỏ sidecar và không tuyên bố mang theo chúng.

## Lỗi

Từ chối trả `{"error", "code"}`.

| Status | Mã |
|--------|-------|
| `400` | `INVALID_SIDECAR`, `IMAGE_DIGEST_REQUIRED`, `INVALID_IMAGE_REFERENCE` |
| `403` | `SIDECARS_DISABLED` |
| `409` | `SIDECARS_NOT_PORTABLE` (xuất), xung đột giữ chỗ slug |
| `422` | `SIDECAR_ENV_MISSING`, `SIDECAR_DISK_MISSING`, `SIDECAR_IMAGE_FORBIDDEN`, `REGISTRY_CREDENTIAL_NOT_FOUND`, `REGISTRY_CREDENTIAL_HOST_MISMATCH`, `REGISTRY_ACCESS_DENIED`, `IMAGE_NOT_FOUND` |
| `502` | `REGISTRY_UNAVAILABLE` |
| `503` | `ENCRYPTION_UNAVAILABLE` |

Schema đầy đủ là `ProjectSidecar` trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml).

::: info CLI
CLI `tose` chưa có cờ cho sidecar. Hãy cấu hình sidecar qua API.
:::

## Liên quan

- [API dự án](/vi/api/projects#sidecars)
- [Biến môi trường](/vi/guide/environment)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Bảng giá](/vi/guide/pricing)
