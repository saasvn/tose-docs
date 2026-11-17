# Tự host

Trang này nêu cấu hình mà TOSE API cần khi bạn tự chạy nó trên production. Mã nguồn và file triển
khai nằm trong [`saasvn/tose-app`](https://github.com/saasvn/tose-app).

## Secret bắt buộc khi chạy production

Khi `APP_ENV=production`, API kiểm tra cấu hình lúc khởi động và **từ chối khởi động** nếu thiếu
bất kỳ biến nào dưới đây. Thông báo lỗi liệt kê mọi key còn thiếu.

| Biến | Mục đích |
|------|----------|
| `JWT_SECRET` | Ký session token. |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL. |
| `ENCRYPTION_KEY` | Mã hóa các secret được lưu như kubeconfig và biến môi trường. Khóa mã hóa là SHA-256 của giá trị này. |

Mọi giá trị `APP_ENV` khác đúng `production` (kể cả `prod`, `Production`, `staging` hoặc không đặt) đều bỏ qua bước kiểm tra này, và API dùng giá trị phát triển cục bộ
cho `JWT_SECRET` và `DATABASE_URL`, và bước kiểm tra luôn qua. Đừng dựa vào các giá trị mặc định đó
cho một hệ thống thật. Mặc định là `development`, vì vậy hãy đặt `APP_ENV=production` một cách
tường minh.

Hãy sinh giá trị ngẫu nhiên đủ mạnh, lưu trong secret manager và không bao giờ commit.

```bash
export APP_ENV=production
export JWT_SECRET="$(openssl rand -hex 32)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgres://user:password@db.internal:5432/tose?sslmode=require"
```

### Giữ `ENCRYPTION_KEY` không đổi

Nó mã hóa kubeconfig, biến của project và template, và bản sao lưu database. Đổi nó khiến dữ liệu
đã mã hóa không đọc được, và không có công cụ mã hóa lại. Hãy sao lưu nó cùng với database, và chạy
`cmd/seed` với cùng giá trị.

### Host từng chạy mà không có `ENCRYPTION_KEY`

Các bản build cũ suy ra khóa mã hóa từ `JWT_SECRET` khi `ENCRYPTION_KEY` chưa đặt. Dữ liệu của
chúng được mã hóa bằng khóa đó. Trước khi triển khai bản có bước kiểm tra production, hãy đặt
`ENCRYPTION_KEY` đúng bằng giá trị `JWT_SECRET` hiện tại trong cùng nguồn cấu hình. Sau đó có thể
xoay `JWT_SECRET` mà không mất dữ liệu.

## Credential không nằm trong URL và log

Với request REST, API chỉ đọc credential từ header `X-API-Key`, `Authorization: Bearer` và cookie `tose_token`. API
từ chối giá trị `api_key`, `access_token` và `tose_sk_` trong query string bằng
`400 credentials_in_url`, và access log chỉ ghi đường dẫn, không ghi query string. Nếu reverse
proxy hoặc load balancer của bạn ghi toàn bộ URL, các log đó nằm ngoài tầm kiểm soát của API, nên
hãy tắt việc ghi query ở đó. Xem [Xác thực](/vi/api/authentication).

## Probe health của template {#template-probes}

Theo mặc định, API thêm startup, readiness (`/health`) và liveness (`/livez`) probe của Kubernetes vào deployment template Dewee, và chạy kiểm tra `/health` công khai (tối đa 3 phút, trên domain mặc định) trước khi ghi một deployment có probe là `running`. Đặt `TEMPLATE_PROBES_ENABLED=false` trên API để tắt cả hai. Cơ chế giám sát của script khởi động vẫn hoạt động vì nó nằm trong mọi image Dewee. Image `custom`, deploy rollback và các template khác không bao giờ bị probe. Xem [Trạng thái health của deployment](/vi/guide/dewee-template#health-state).

## Cài đặt tùy chọn cho operator {#optional-operator-settings}

Cả hai cài đặt đều tắt nếu bạn không đặt.

| Biến | Mặc định | Tác dụng |
|------|----------|----------|
| `POST_DEPLOY_HEALTH_GATE_ENABLED` | `false` | Đặt `true` để kiểm tra độ sẵn sàng Kubernetes của image vừa deploy trong 10 giây sau mỗi rollout build-and-deploy thành công (rollback và deploy template không được kiểm tra). Kết quả được lưu vào deployment và phát thành ops event. Kiểm tra thất bại không bao giờ rollback hay dừng deployment. Xem [Health gate sau deploy](/vi/api/projects#health-gate) |
| `OPS_RETENTION_DAYS` | không đặt (giữ mãi) | Số ngày nguyên dương của lịch sử ops đã hoàn tất cần giữ. `0` hoặc không đặt thì không xóa gì; giá trị không hợp lệ làm API dừng khi khởi động |

Retention xóa các dòng `ops_outbox` đã gửi, event `info` đứng riêng và incident đã giải quyết cùng timeline của chúng. Nó giữ incident đang mở, event `warning` và `critical` đứng riêng, và mọi incident có mục, event hoặc thông báo chưa xử lý gần đây. Lần chạy đầu sau khi khởi động 10 phút, rồi mỗi giờ, theo lô tối đa 500 dòng. Tăng giá trị về sau không khôi phục được lịch sử đã xóa, nên hãy chọn khoảng thời gian và sao lưu database trước. Xem `[ops-retention]` trong log backend để biết đã chạy gì. Xóa workspace cũng xóa lịch sử ops của nó trong cùng transaction.

## Tính năng tắt cho đến khi được bật {#optional-features}

Người dùng không dùng được các tính năng này cho đến khi operator đặt công tắc của chúng. Chỉ bật
một tính năng sau khi các kiểm tra riêng của nó bên dưới đã đạt.

| Biến | Đặt ở | Tác dụng khi đặt `true` |
|------|-------|-------------------------|
| `ANALYTICS_ENABLED` | API | Phục vụ các route phân tích workspace; khi tắt, chúng trả `404`. `GET /api/public/features` báo cùng công tắc này dưới tên `analytics`, và dashboard chỉ hiện mục **Analytics** trên sidebar cùng phần tóm tắt ở trang Overview khi nó là `true`. Xem [Phân tích workspace](/vi/api/analytics). |
| `AGENT_ENVIRONMENT_ENABLED` | API | Agent nhận `environment` (biến, tham chiếu secret, script cài đặt) và `GET .../agents/{agent_id}/environment` trả lời; khi tắt, route đó trả `409 NOT_SUPPORTED`. Environment được kiểm tra và lưu cùng agent nhưng **chưa được áp dụng** vào agent, nên hãy giữ tắt trên production cho đến khi bộ thực thi thiết lập (setup executor) được phát hành. |
| `DEWEE_SUPPORT_ENABLED` | Dashboard (`tose-frontend`) | Bật [chat hỗ trợ](#support-chat). |
| `MULTIX_TEMPLATE_ENABLED` | API | Đưa [template Multix](#multix-template) vào catalog, chỉ khi có kèm `MULTIX_SERVER_IMAGE` được ghim theo digest. |

### Chat hỗ trợ {#support-chat}

Dashboard có thể chứa một chat hỗ trợ Dewee, mọi thao tác của nó đi qua
[support broker](/vi/api/support-assistant). Chat tắt theo mặc định và chưa được bật cho người dùng
TOSE: nó cần một tích hợp Website chat và một ứng dụng định danh (identity application) riêng cho
Dewee trong Dewee CCP, và tích hợp đó phải được nghiệm thu. Khi `DEWEE_SUPPORT_ENABLED` tắt, liên
kết **Support** ở header mở Discord.

Để bật cho dashboard tự host, đặt các biến sau trong môi trường của tiến trình dashboard (giá trị lấy
từ kho secret và CCP của bạn; không bao giờ commit chúng):

- `DEWEE_SUPPORT_ENABLED=true`
- `DEWEE_CCP_CHAT_URL`, `DEWEE_WEBCHAT_INTEGRATION_ID`, `DEWEE_WEBCHAT_INTEGRATION_SECRET`
- `DEWEE_WEBCHAT_SECRET` (ít nhất 32 ký tự ngẫu nhiên)
- `DEWEE_IDENTITY_APP_ID`, `DEWEE_IDENTITY_ISSUER`, `DEWEE_IDENTITY_ASSERTION_SECRET`
- `DEWEE_ALLOWED_ORIGINS`: origin chính xác của dashboard

Không đặt bất kỳ biến gateway nào của template Dewee (`DEWEE_GATEWAY_URL`, `DEWEE_GATEWAY_TOKEN`, `DEWEE_TENANT_ID`, `DEWEE_AGENTS`, `DEWEE_DEFAULT_AGENT`, `DEWEE_ALLOW_CLIENT_CREDENTIALS` hay `DEWEE_CLIENT_CREDENTIAL_HOSTS`): chỉ cần có một biến, dashboard từ chối khởi động
chat và `/api/dewee/status` báo lý do `gateway_vars_set`. Chỉ đặt `DEWEE_TRUSTED_PROXY=true` khi mọi request tới dashboard đều đi qua reverse proxy ghi
đè hoặc loại bỏ `cf-connecting-ip`, `x-real-ip` và `x-forwarded-for`.

Sau mỗi lần deploy, kiểm tra `GET /api/dewee/status` trên origin của dashboard. `available: false`
nghĩa là chat không chạy; dòng log dashboard `[support-chat] not available: <reason>` cho biết phần
còn thiếu. Khi chat không khả dụng, liên kết Support vẫn đưa ra Discord.

Runbook đầy đủ, gồm cả bước kiểm tra Content-Security-Policy cần làm trước khi bật chat cho người
dùng, nằm trong `docs/operations.md` (support chat) của
[`saasvn/tose-app`](https://github.com/saasvn/tose-app).

### Template Multix {#multix-template}

Template 1-click Multix Server bị ẩn theo mặc định. Nó chỉ xuất hiện trong catalog khi API có cả hai:

- `MULTIX_TEMPLATE_ENABLED=true`, và
- `MULTIX_SERVER_IMAGE` trỏ tới một image Multix server độc lập đã được duyệt, ghim theo digest
  (`repo:tag@sha256:<64 hex>`). Image chỉ có tag hoặc không đặt image thì template vẫn ẩn, và API
  ghi log lý do.

Hiện hãy giữ công tắc tắt. Bản phát hành ổn định của Multix upstream (v1.28.0) chưa có server độc
lập, và template còn cần bước nhận quyền sở hữu (owner claim) một lần mà một image server đã phát
hành phải hỗ trợ. Bằng chứng phát hành được theo dõi tại
[mrgoonie/multix-cli#563](https://github.com/mrgoonie/multix-cli/issues/563) và
[mrgoonie/multix-cli#570](https://github.com/mrgoonie/multix-cli/issues/570).

Những gì template áp đặt khi đã bật:

- Mỗi instance có `SESSION_SECRET`, `SECRETS_ENCRYPTION_KEY` và `MULTIX_BOOTSTRAP_TOKEN` được sinh
  riêng. Các route env từ chối hiện, đặt hoặc xóa chúng (`403 GENERATED_SECRET`), và deploy dừng lại
  nếu thiếu một trong số đó.
- Multix luôn chạy image đã cấu hình hoặc image mà chính instance này từng chạy. Người dùng không đặt
  được image tùy chỉnh; `image_source: catalog` để nâng cấp và `rollback_to` để quay lại.
- Chi phí nhà cung cấp media theo mô hình tự mang key (BYOK) và do nhà cung cấp tính, không trừ vào
  ví TOSE. TOSE chỉ tính tài nguyên hosting.

Bỏ công tắc thì template lại bị ẩn; các instance hiện có vẫn chạy. Manifest
([`multix.json`](https://github.com/saasvn/tose-app/blob/master/internal/templatecatalog/manifests/multix.json))
quy định port, mount dữ liệu, secret được sinh và kích thước tối thiểu, còn runbook nằm trong
`docs/operations.md` (Multix template) của `saasvn/tose-app`.

## Công bố hợp đồng API

API phục vụ spec OpenAPI tại `/api/openapi.yaml`, nên một instance tự host tự có tài liệu. Hãy sinh
client theo base URL của bạn. Xem [Tài liệu REST API](/vi/api/reference).

## Thumbnail của project

Thumbnail của project là ảnh chụp trang https công khai của project, được chụp sau mỗi lần deploy. API không bao
giờ chạy trình duyệt trong pod của chính nó. Mỗi lần chụp là một pod tồn tại ngắn cùng một NetworkPolicy trong
namespace `tose-thumbnail` trên cluster của project, và cả hai bị xóa khi chụp xong.

Những gì giới hạn pod chụp ảnh:

- **Mạng.** Egress chỉ được phép tới địa chỉ mà API đã phân giải và ghim, dạng `<ip>/32` trên TCP 443. Không có
  DNS, không có ingress, và không có đường tới dải mạng của cluster hay metadata endpoint.
- **Danh tính.** Pod không có service-account token và không có Secret.
- **Trình duyệt.** Sandbox của Chromium luôn bật và worker từ chối chạy bằng root.

Để bật thumbnail cho API tự host:

1. Áp dụng `deploy/thumbnail` từ [`saasvn/tose-app`](https://github.com/saasvn/tose-app) lên cluster. Thư mục này tạo namespace,
   policy default-deny, quota và một Role. Gán Role đó cho danh tính trong kubeconfig của API.
2. Publish image build từ `images/thumbnail-shot` và đặt `THUMBNAIL_IMAGE` cho API.
3. Nếu seccomp profile mặc định của container runtime chặn user namespace (containerd chặn với pod không có
   capability), hãy cài một profile cục bộ trên node cho phép chúng và đặt `THUMBNAIL_SECCOMP_PROFILE` là đường dẫn
   của profile đó trong thư mục seccomp của kubelet.

Nếu chưa đặt `THUMBNAIL_IMAGE`, việc chụp bị bỏ qua và ghi log với tiền tố `[screenshot]`. Deploy không bị ảnh hưởng.
Nếu đã đặt image nhưng thiếu namespace hoặc Role, mỗi lần deploy ghi log các lần chụp thất bại và vẫn thành công.

Cluster do workspace sở hữu hiện không có thumbnail.

Chi tiết vận hành, gồm giới hạn của pod và cách kiểm tra policy, nằm trong `docs/operations.md` (mục "Project
thumbnails") và `deploy/thumbnail/README.md` của `saasvn/tose-app`.

## Tài liệu liên quan

- [Xác thực](/vi/api/authentication)
- [Mã lỗi](/vi/api/errors)
