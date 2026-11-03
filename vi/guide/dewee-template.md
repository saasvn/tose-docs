# Runbook template Dewee

Runbook này nói về **template Dewee 1-click** mà TOSE cung cấp hiện nay: cách tạo và triển khai, phần nào đã được bảo vệ và phần nào chưa, MCP và OAuth hoạt động ra sao trên instance đã triển khai, trạng thái "running" thực sự nghĩa là gì, và cách nâng cấp hoặc rollback.

Trang mô tả template đúng như hiện trạng. Nếu một lớp bảo vệ còn đang được xây dựng, trang sẽ nói rõ và đưa ra bước thủ công cần làm trong lúc chờ. Đây không phải bộ tài liệu registry `tose.yaml` trong tương lai; về phần đó, xem [File cấu hình](/vi/guide/configuration).

::: warning Chưa được xác minh là one-click production
Template Dewee đang ở mức **thử nghiệm (experimental)**. Bài kiểm tra end-to-end (tạo, xác thực, WebSocket, MCP, dữ liệu bền vững, triển khai lại) chưa đạt, nên TOSE chưa gắn nhãn đã xác minh. Hãy đọc [Cam kết bảo mật](#security-contract) trước khi đưa instance ra Internet.
:::

## Chọn template {#choose-the-template}

```bash
tose template catalog
```

Mục Dewee (`dewee`) trong catalog có các giá trị mặc định sau:

| Mục | Giá trị |
|-----|---------|
| Cổng | `3000` (nginx, công khai) đặt trước backend Dewee ở `127.0.0.1:18790` |
| CPU | `1` hoặc `2` vCPU. Mặc định `1` |
| RAM | `2` hoặc `4` GB. Mặc định `2` |
| Replica | Luôn là `1`. Ổ đĩa bền vững chỉ mount được vào một pod |
| Image mặc định | Tag hiển thị bởi `tose template catalog` hoặc `GET /available-templates`. Đây là mặc định của catalog và có thể thay đổi, không phải digest |
| Cơ sở dữ liệu | PostgreSQL bên ngoài do bạn cung cấp qua `GOCLAW_POSTGRES_DSN` |

Giá trị CPU hoặc RAM khác sẽ bị từ chối với lỗi `400`. Catalog có thể hiển thị image mới hơn image instance của bạn đang chạy; xem [Phiên bản và nâng cấp](#versions-and-upgrades).

### Chi phí: phí mở khóa và credit ví

Dewee là template trả phí. Tạo instance đầu tiên trong một workspace cần thanh toán mở khóa một lần, và toàn bộ số tiền vẫn nằm trong ví dưới dạng credit. Khi workspace chưa mở khóa, `POST /workspaces/<slug>/templates` trả về `402` kèm `unlock_url`. Mức phí hiện tại lấy từ API (`unlock_fee_vnd` trong catalog và trong `GET /workspaces/<slug>/templates/unlock-status`), nên trang này không lặp lại con số. Compute và lưu trữ được tính từ ví như mô tả trong [Bảng giá](/vi/guide/pricing).

### Dùng key của riêng bạn (BYOK)

Dewee gọi các nhà cung cấp AI bằng key mà bạn cấu hình trong instance. Nhà cung cấp tính phí phần sử dụng đó. Ví TOSE chỉ trả phí hạ tầng.

## Tạo instance {#create-an-instance}

Tạo, thay đổi và xóa instance cần vai trò **admin** của workspace. Thành viên chỉ xem được.

### Dashboard

1. Mở **Templates** trong workspace và chọn **Dewee**.
2. Thanh toán phí mở khóa nếu được yêu cầu.
3. Chọn CPU và RAM rồi tạo.
4. Mở **Environment** và đặt ba biến bắt buộc (bên dưới).
5. Bấm **Deploy**.

### CLI

```bash
tose template create my-dewee --template dewee

# Secret đi qua file chỉ mình bạn đọc được, hoặc stdin. Không bao giờ viết inline.
install -m 600 /dev/null dewee.env
$EDITOR dewee.env        # GOCLAW_POSTGRES_DSN, GOCLAW_ENCRYPTION_KEY, GOCLAW_GATEWAY_TOKEN
tose template env set my-dewee --env-file dewee.env
shred -u dewee.env 2>/dev/null || rm -f dewee.env

tose template deploy my-dewee --wait
tose template info my-dewee
```

Ba biến bắt buộc:

| Biến | Mục đích |
|------|----------|
| `GOCLAW_POSTGRES_DSN` | Chuỗi kết nối tới PostgreSQL của bạn |
| `GOCLAW_ENCRYPTION_KEY` | Key Dewee dùng để mã hóa secret nó lưu |
| `GOCLAW_GATEWAY_TOKEN` | Token bảo vệ API và WebSocket. Xem bên dưới |

Các tên `DEWEE_*` (ví dụ `DEWEE_GATEWAY_TOKEN`) được chấp nhận làm alias và được sao chép sang tên `GOCLAW_*` khi khởi động, nếu tên `GOCLAW_*` đang trống. Chỉ đặt một cách viết, không đặt cả hai.

`tose template env list` che các giá trị mà nó nhận ra là credential (tên chứa `token`, `secret`, `password`, `api_key` và tương tự), trong đó có `GOCLAW_GATEWAY_TOKEN`. Lệnh này **không** che `GOCLAW_POSTGRES_DSN` và `GOCLAW_ENCRYPTION_KEY` khi bạn đặt chúng từ file hoặc stdin, nên hai giá trị này có thể bị in ra dạng văn bản thường. Hãy đặt chúng bằng prompt ẩn (`tose template env set my-dewee GOCLAW_ENCRYPTION_KEY`) và tránh chạy `env list` trên màn hình dùng chung hoặc trong log CI. Bản sửa được theo dõi tại [tose-cli#40](https://github.com/saasvn/tose-cli/issues/40). Xem [`tose template`](/vi/commands/template) để biết đầy đủ các lệnh.

## Cam kết bảo mật {#security-contract}

Backend Dewee lắng nghe trên `127.0.0.1`, nhưng nginx công khai `/v1/*`, `/ws` và `/health` của backend ra Internet. Điều đó làm thay đổi ý nghĩa của "local".

- **Gateway token là bắt buộc.** Khi `GOCLAW_GATEWAY_TOKEN` trống, Dewee có thể rơi về chế độ local không xác thực, cấp quyền admin hoặc operator cho mọi bên gọi mà nó cho là local. Phía sau reverse proxy, mọi request đều trông như local, nên một instance không có token có thể bị truy cập mà không cần xác thực.
- **Hiện nay nền tảng chưa chặn deploy khi thiếu token.** Catalog liệt kê biến này là bắt buộc, nhưng API không ép buộc. Cơ chế chặn fail-closed và tự cấp token đang được thực hiện ([tose-app#272](https://github.com/saasvn/tose-app/issues/272)). Cho đến khi được phát hành, bạn phải tự đặt một token ngẫu nhiên đủ mạnh trước lần deploy đầu tiên.
- **Tạo token trên máy của bạn**, ví dụ `openssl rand -hex 32`, và chỉ đặt vào file env được bảo vệ hoặc stdin. Không dán vào chat, ticket hay lịch sử shell.
- **Tên secret được lưu.** Ba biến ở trên được lưu mã hóa theo từng instance. `tose template info` che chúng. Xem ghi chú ở trên về `env list`. Giá trị nào đã hiện ra qua thao tác reveal thì coi như đã lộ và hãy xoay vòng.
- **Không công khai bridge nội bộ.** `/mcp/bridge` dùng nội bộ trong instance và xác thực bằng gateway token. Đừng công khai nó qua proxy riêng, rule domain tùy chỉnh hay tunnel.
- **Quyền hạn.** Quyền operator và admin bên trong Dewee đến từ token và người dùng của chính Dewee. Vai trò workspace của TOSE quyết định ai được thay đổi template và biến môi trường của nó.

### Kiểm tra instance có thể thiếu token

Bạn không cần reveal bất kỳ credential nào để biết.

1. Chỉ liệt kê tên biến:

   ```bash
   tose template env list my-dewee
   ```

   Tìm `GOCLAW_GATEWAY_TOKEN` (hoặc `DEWEE_GATEWAY_TOKEN`). Nếu không có, hãy coi instance là đang bị lộ.
2. Gọi một route cần xác thực mà không kèm token. Thay host bằng host lấy từ `tose template info`:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://<host-instance-cua-ban>/v1/agents
   ```

   Kết quả mong đợi là `401` hoặc `403`. Nếu là `200`, API đã trả lời mà không cần credential.
3. Nếu thiếu token, đặt token mới bằng `tose template env set my-dewee --env-file ...` rồi deploy lại. Các phiên trình duyệt và API client đang dùng token cũ sẽ ngừng hoạt động, nên hãy lên kế hoạch.
4. Xoay vòng mọi key nhà cung cấp, mật khẩu database và secret khác mà instance từng giữ, vì một admin không xác thực có thể đã đọc chúng.

## MCP và OAuth {#mcp-and-oauth}

Dewee có hai bề mặt MCP khác nhau. Đừng nhầm lẫn.

| Route | Đối tượng | Trạng thái trên template TOSE |
|-------|-----------|-------------------------------|
| `/mcp/server` (legacy `/mcp`) | MCP client công khai, có OAuth discovery | **Chưa được route.** nginx của template chỉ chuyển tiếp `/v1/`, `/ws` và `/health`, nên các đường dẫn này rơi vào web app và trả về trang HTML thay vì phản hồi MCP. Việc route công khai đang được thực hiện ([tose-app#273](https://github.com/saasvn/tose-app/issues/273)) |
| `/mcp/bridge` | Nội bộ, chỉ dùng gateway token | Tuyệt đối không công khai |

Cho đến khi bản sửa proxy được phát hành, đừng cấu hình MCP client tới host công khai của instance, và đừng vòng qua bằng rule proxy thủ công. Sau khi bản sửa được phát hành, chỉ kết nối qua route công khai và kỳ vọng:

- `POST /mcp/server` với credential hợp lệ trả về phản hồi JSON-RPC. Không có token hoặc sai token trả về `401` kèm challenge `WWW-Authenticate`.
- Metadata OAuth discovery được phục vụ từ cùng host công khai.
- `/mcp/bridge` từ Internet bị từ chối.

Xử lý sự cố:

| Triệu chứng | Nguyên nhân có thể |
|-------------|--------------------|
| Nhận trang HTML ở chỗ cần JSON | Đường dẫn chưa được proxy tới backend |
| `401` kèm challenge | Thiếu hoặc sai credential. Đăng nhập OAuth lại trong client |
| Discovery chạy nhưng client không gọi được tool | URL công khai hoặc scheme trong metadata không khớp với domain bạn dùng |

Đây là MCP server của chính instance Dewee. Với connector tới TOSE, xem [MCP clients](/vi/mcp/clients) và [Giao thức, OAuth và scope](/vi/mcp/oauth).

## Health và readiness {#health-and-readiness}

Ý nghĩa của các trạng thái:

- `running` nghĩa là pod đã sẵn sàng theo cách Kubernetes tính. Container template chưa có startup, readiness hay liveness probe, và script khởi động chờ tối đa 90 giây để backend trả lời `/health`, sau đó vẫn chạy nginx dù backend chưa lên. Vì vậy `running` **không** chứng minh API đang phản hồi ([tose-app#274](https://github.com/saasvn/tose-app/issues/274)).
- Image có `HEALTHCHECK` Docker riêng gọi `http://127.0.0.1:18790/health`. Nó kiểm tra backend, không kiểm tra route công khai qua nginx.

Tự kiểm tra một instance:

```bash
tose template info my-dewee                  # trạng thái và liên kết
tose template logs my-dewee -f               # log container trực tiếp (cần trạng thái running)
tose template logs my-dewee --build -d <deployment-id>   # log rollout
curl -s -o /dev/null -w '%{http_code}\n' https://<host-instance-cua-ban>/health
```

| Triệu chứng | Cần kiểm tra |
|-------------|--------------|
| `502` từ host công khai | Backend chưa chạy phía sau nginx. Đọc log trực tiếp để tìm crash, `GOCLAW_POSTGRES_DSN` sai hoặc migration lỗi |
| `/health` ổn nhưng giao diện web không kết nối được | Proxy phía trước TOSE chặn nâng cấp `/ws`, hoặc token sai |
| Log kết thúc bằng `Database upgrade failed` | Migration lỗi và container thoát. Xem [Nâng cấp](#versions-and-upgrades) |
| Không bao giờ thấy `Backend ready after Ns` | Backend không lên trong 90 giây. Kiểm tra kết nối tới database |
| Đăng nhập lần đầu | Mở liên kết dashboard và hoàn tất đăng nhập bootstrap một lần. CLI không bao giờ in credential bootstrap |
| Tạo bị từ chối với HTTP `402` | Chưa trả phí mở khóa hoặc số dư ví quá thấp. Xem [Bảng giá](/vi/guide/pricing) |

## Phiên bản và nâng cấp {#versions-and-upgrades}

- **Image.** Instance chạy image được lưu trên nó. `tose template deploy` thông thường (chế độ `image`) giữ nguyên image đó và không tự nâng cấp. `tose template info` hiển thị image đã deploy, đã cấu hình và khả dụng, cùng việc có bản cập nhật hay không. Chỉ chuyển sang phiên bản catalog bằng `tose template deploy --upgrade`, và truyền `--expected-image` (dòng `Configured:`) để deploy thất bại nếu image đã đổi trong lúc đó. `--mode build` không thay image.
- **Tag không phải digest.** Tag có thể bị push lại. Để có bản ghi tái lập được, hãy lấy digest của image bạn đang chạy và lưu cùng ghi chú của bạn.
- **Tự động nâng cấp được bật mặc định.** Mỗi lần khởi động khi có `GOCLAW_POSTGRES_DSN`, container chạy `dewee upgrade` và từ chối khởi động nếu lệnh lỗi. Đặt `GOCLAW_AUTO_UPGRADE=false` nếu bạn muốn tự chạy nâng cấp vào thời điểm bạn chọn.
- **Sao lưu trước.** PostgreSQL là của bạn: TOSE không snapshot nó. Trước mọi thay đổi phiên bản, hãy sao lưu và khôi phục thử một lần vào database tạm để chứng minh bản sao lưu dùng được. Sao lưu cả dữ liệu ổ đĩa bền vững mà bạn cần.
- **Rollback không đối xứng.** `tose template deploy --rollback <deployment_id>` chạy lại image cũ, nhưng **không** quay lại schema hay dữ liệu database. Migration đã chạy có thể không tương thích với image cũ. Để quay lại an toàn, hãy khôi phục bản sao lưu database cùng với image cũ.
- **Gián đoạn.** Template chạy một replica trên ổ đĩa chỉ một pod mount được, và deploy lại sẽ thay pod. Hãy dự kiến có gián đoạn khi deploy. TOSE không hứa zero-downtime cho template này.
- **Chủ động nâng cấp.** Chỉ nâng cấp khi bạn chọn (`--upgrade`), từ một bản sao lưu, ngoài giờ cao điểm. Thay đổi của catalog không tự nâng cấp cho bạn.

## Release gate và bảng tương thích {#release-gate-and-compatibility}

TOSE chỉ công bố một phiên bản Dewee là đã xác minh sau khi một lần chạy end-to-end đạt trên cụm staging: tạo, xác thực qua domain công khai, WebSocket, MCP, dữ liệu còn sau khi khởi động lại, deploy lại và rollback, cùng các tình huống tiêu cực ở trên ([tose-app#276](https://github.com/saasvn/tose-app/issues/276)).

| Trường | Giá trị hiện tại |
|--------|------------------|
| Nguồn Dewee | `https://github.com/nextlevelbuilder/dewee`, nhánh `dev` |
| Image tag | Xem `tose template catalog` |
| Image digest, commit Dewee, revision TOSE, flag | Chưa công bố |
| Ngày xác minh gần nhất | Chưa có |
| Mức hỗ trợ | **Thử nghiệm (experimental)** |

Khi có một lần chạy đã xác minh, bảng này sẽ có thêm digest, commit, revision TOSE, ngày và chữ *verified*. Đừng coi template là one-click đã xác minh trước thời điểm đó.

## Checklist triển khai theo giai đoạn {#staged-rollout-checklist}

1. Tạo instance trong workspace không phải production.
2. Đặt ba biến từ file được bảo vệ. Xác nhận token có mặt bằng `tose template env list`.
3. Deploy với `--wait`. Xác nhận `/health`, rồi xác nhận request `/v1/agents` không xác thực bị từ chối.
4. Đăng nhập qua liên kết dashboard, tạo một agent, khởi động lại instance và xác nhận agent vẫn còn.
5. Sao lưu database và khôi phục thử.
6. Chỉ sau đó mới dùng cho dữ liệu thật.

## Liên quan

- [`tose template`](/vi/commands/template)
- [Biến môi trường](/vi/guide/environment)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
- [Bảng giá](/vi/guide/pricing)
- [MCP clients](/vi/mcp/clients)
