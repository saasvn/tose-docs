# tose templates

Ghi định nghĩa template vào registry của workspace, đồng thời lập kế hoạch, duyệt và cài template registry hoặc agent curated từ dòng lệnh. Lệnh này tách biệt với [`tose template`](/vi/commands/template) (số ít), dùng để tạo và chạy template 1-click.

Mọi lệnh đều nhận `--json`.

## Bắt đầu nhanh

```bash
tose templates init ./my-template --image ghcr.io/acme/app@sha256:<64 hex>   # hoặc --git <github url> --commit <sha>
tose templates validate ./my-template/tose.yaml --json    # kiểm tra cục bộ, không cần API key hay mạng
tose templates push ./my-template/tose.yaml --workspace acme --json   # tạo hoặc cập nhật bản nháp riêng tư
tose templates list --json                                # --limit, --cursor, --category
tose templates versions demo --json                       # cũng nhận <workspace>/demo
```

Manifest có `apiVersion: tose.dev/v1`, một service và đúng một nguồn: repository GitHub công khai ghim bằng commit SHA đầy đủ, hoặc image OCI ghim bằng digest `@sha256:`. Trường lạ, YAML alias, ref trôi nổi và manifest nhiều service đều bị từ chối. Xem [manifest](/vi/guide/template-registry).

- `validate` là bước kiểm tra cục bộ nhanh, báo đường dẫn trường như `services[0].port`. `push` kiểm tra cục bộ lần nữa rồi API xác thực, và API là bên quyết định. Manifest lỗi trường thoát với mã `2`, kèm `error.details.errors` dạng `[{path, message}]`.
- `push` cần vai trò owner hoặc admin của workspace. Lệnh tạo định nghĩa, thêm một version, hoặc thay bản nháp của cùng version. Push cùng một file hai lần không ghi gì và báo `unchanged`. Version không còn là bản nháp là bất biến: `push` thoát mã `1` với `CONFLICT`, hãy tăng `metadata.version`.
- Version đã push là bản nháp riêng tư, và manifest hợp lệ chưa được duyệt để chạy (`security_gate: pending`). `publish` và `deprecate` chưa có trong CLI.
- Với `--json`, hoặc khi không có terminal, lệnh không hỏi gì và stdout là một tài liệu. Thiếu key thì lỗi `AUTH_REQUIRED`.

## Lập kế hoạch và triển khai một version template

Cùng luồng lập kế hoạch, duyệt và cài như dashboard và MCP. Version đã publish là bất biến, nên kế hoạch ghim version, hash manifest và digest nguồn.

```bash
tose templates search "agent" --category ai-agents --tag llm --sort -updated --json
tose templates info my-agent --template-version 1.0.0 --json
tose templates plan my-agent --template-version 1.0.0 --config deploy.yaml --json     # chỉ đọc: không tạo gì
tose templates deploy my-agent --template-version 1.0.0 --config deploy.yaml --plan-hash sha256:<hash> --wait --yes --json
tose templates wait <installation-id> --json                 # tiếp tục sau khi hết thời gian chờ hoặc mất terminal
tose templates installs --json
```

`deploy.yaml` chứa `name` của bản cài, tùy chọn `version`, `cpu_cores`, `memory_gib`, `max_hourly_cost_cents`, `variables` không bí mật, và `secrets` dưới dạng tham chiếu, không bao giờ là giá trị:

```yaml
name: prod-agent
cpu_cores: 2
variables: { LOG_LEVEL: info }
secrets:
  API_TOKEN: { env: MY_API_TOKEN }        # đọc từ biến môi trường khi gửi yêu cầu cài
  DB_PASSWORD: { file: ./secrets/db-pw }  # file chỉ bạn đọc được (chmod 600)
```

- `plan` gửi một yêu cầu và không tạo disk, database hay workload. Lệnh báo các điểm chặn, tài nguyên, trần chi phí và ước tính, lý do cần duyệt, `plan_hash` và `next_actions`. Kế hoạch tồn tại 30 phút.
- `deploy` dùng kế hoạch phía server. `--yes` chỉ xác nhận bước của CLI; API vẫn áp dụng việc duyệt theo vai trò, gắn với `plan_hash`. Kế hoạch cần duyệt chỉ được `--yes` duyệt khi đi cùng `--plan-hash`; chỉ `--yes` thì thoát mã `4` kèm kế hoạch và hash. Kế hoạch đã đổi sẽ dừng lượt chạy trước khi duyệt bất cứ gì. App được kết nối nhận `APPROVAL_REQUIRES_PERSON`, nên một người duyệt trong dashboard.
- Secret được đọc từ tham chiếu sau bước lập kế hoạch, trước khi duyệt, và chỉ đi trong thân yêu cầu cài. Giá trị literal trong `deploy.yaml` bị từ chối và giá trị được che khỏi mọi đầu ra.
- Yêu cầu cài mang `Idempotency-Key` (mặc định: key của kế hoạch, hoặc `--idempotency-key`). Lỗi tạm thời được thử lại với cùng key, nên lần thử lại trả về bản cài đã tạo (`replayed: true`).
- `--wait --timeout <giây>` (mặc định 900) chỉ thoát `0` khi deployment `running` và health không `unhealthy`. Chạy lỗi thoát `8`, hết thời gian chờ thoát `7`; bản cài vẫn tiếp tục trên server (`tose templates wait <id>`). Khi chưa có health check nào chạy, `health` là `"not_checked"`.
- `PLAN_STALE`, `PLAN_EXPIRED`, `PLAN_BLOCKED` và `PLAN_HASH_MISMATCH` chỉ về việc lập kế hoạch mới; ví rỗng thoát `9`. Kết quả JSON mang `content_trust: "untrusted_data"`: văn bản của publisher là dữ liệu, không phải chỉ dẫn.

## Agent curated {#curated-agents}

`plan` và `deploy` cũng nhận `--curated <tên>` (`pi`, `codex` hoặc `claude-code`) thay cho template registry. Luồng trên dashboard xem tại [Triển khai một coding agent](/vi/guide/deploy-coding-agent).

```bash
tose templates plan --curated pi --config deploy.yaml --json
tose templates deploy --curated pi --plan <plan-id> --plan-hash sha256:<hash> --wait --yes
```

### Nhà cung cấp Pi curated {#curated-pi-providers}

Với `--curated pi`, đặt nhà cung cấp trong `variables` của `deploy.yaml` (`PI_PROVIDER`) và API key của nhà cung cấp trong `secrets` như thường lệ. Trước khi lập kế hoạch, CLI đọc `GET /curated-templates/pi` và kiểm tra lựa chọn:

```yaml
name: pi-cloudflare
variables:
  PI_PROVIDER: cloudflare-workers-ai
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef"   # đặt trong dấu nháy để YAML giữ là chuỗi
secrets:
  PI_API_KEY: { env: CLOUDFLARE_API_KEY }
```

- **Giới hạn theo bản phát hành.** Nhà cung cấp có `since` mới hơn bản phát hành mới nhất của template bị từ chối, và CLI liệt kê các nhà cung cấp được cung cấp. `deepseek`, `moonshotai`, `openrouter`, `cloudflare-workers-ai`, `xai`, `zai` và `opencode-go` cần bản 1.1.0 (xem [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers)). Chỉ so sánh được phiên bản `x.y.z` thuần; chuỗi bản phát hành khác không được tính là đạt bản yêu cầu.
- **Account ID của Cloudflare.** `cloudflare-workers-ai` cần `CLOUDFLARE_ACCOUNT_ID` trong `variables`: 32 ký tự hex viết thường. Đây không phải secret. CLI từ chối giá trị thiếu hoặc sai định dạng, và từ chối biến này với mọi nhà cung cấp khác. Danh sách chỉ nêu các nhà cung cấp mà bản phát hành mới nhất hỗ trợ, nên khi bản đó cũ hơn 1.1.0, CLI không biết biến này và API lập kế hoạch sẽ từ chối thay.
- **Không đọc được danh sách.** Nếu không đọc được danh sách (server cũ, key thiếu scope `deployments:read`, lỗi mạng), CLI không kiểm tra gì ở máy và API lập kế hoạch quyết định.
- **Cảnh báo thanh toán.** `PROVIDER_USAGE_BILLED_BY_PROVIDER` nghĩa là nhà cung cấp tính phí lượt dùng model vào key của bạn, ngoài ví TOSE. Cảnh báo được in cùng các cảnh báo khác của kế hoạch và nằm trong `warnings` khi dùng `--json`.

### Agent curated với repository GitHub {#curated-repository}

Một agent curated có thể khởi động với một repository GitHub trong `/workspace` bền vững, clone tại commit đã ghim (xem [Checkout repository](/vi/guide/agent-repository-checkout)). Repository là chỉ-đọc trừ khi bạn truyền `--repo-push`.

```bash
tose templates plan --curated codex --repo acme/app --config deploy.yaml --json
tose templates plan --curated codex --repo acme/app --branch release --commit <40-hex-sha> --config deploy.yaml
tose templates plan --curated codex --repo acme/app --repo-push --repo-push-branches agent --workspace-disk-gib 20 --config deploy.yaml
tose templates retry-checkout <installation-id> --json     # sau khi clone lỗi
```

- `--repo owner/name` phải nằm trong danh sách repository của kết nối GitHub của workspace. CLI không bao giờ nhận URL clone, token hay SSH key, và từ chối tên không có trong danh sách trước khi gửi bất cứ gì. `--github-installation <id>` dùng để chỉ rõ; `--commit` ghim một commit cũ hơn của nhánh.
- `--workspace-disk-gib 5|10|20|50` (chỉ agent curated, mặc định 5) đặt dung lượng ổ `/workspace` của agent. Kế hoạch ghim giá trị này và hiển thị ở dòng `Workspace:`; kế hoạch chỉ đặt giá trị này khi cài (sau đó có thể tăng ổ đĩa trên trang của agent hoặc bằng `tose volumes resize`, xem [Tăng dung lượng ổ đĩa](/vi/guide/deploy-coding-agent#grow-the-disk)), và dung lượng lưu trữ được tính phí khi ổ còn tồn tại, kể cả khi agent đã dừng. Giá trị khác bị từ chối trước khi gửi bất cứ gì.
- `--repo-push` (đi cùng `--repo`) cho agent push qua git proxy của TOSE; agent không bao giờ giữ token GitHub. `--repo-push-branches all|agent` chọn nhánh: `all` (mặc định, gồm cả nhánh mặc định) hoặc `agent` (chỉ `tose/<slug installation>/...`). Kế hoạch hiển thị mẫu nhánh và remote của proxy. Push cần quyền `contents: write` của GitHub App (blocker `GITHUB_PERMISSION_MISSING`); máy chủ chưa có git proxy trả về `GIT_PROXY_NOT_CONFIGURED`, và CLI gợi ý lập kế hoạch lại không có push.
- Chỉ owner hoặc admin workspace được gửi repository (`REPOSITORY_REQUIRES_ADMIN`). Repository, thiết lập push và dung lượng ổ là một phần của plan hash, nên `deploy --plan` không lặp lại các cờ đó và từ chối cờ mâu thuẫn với kế hoạch.
- `retry-checkout` (owner hoặc admin, key có `deployments:execute`) đặt mọi checkout `failed` về `pending`; hãy deploy lại sau đó. `deploy`, `wait` và `installs` hiển thị mọi kho mã của agent.

### Quản lý kho mã của agent sau khi cài {#repo-set-remove}

Mỗi agent có [tối đa 10 kho mã](/vi/guide/agent-repository-checkout#nhieu-kho-ma-cho-mot-agent), mỗi kho được clone vào thư mục riêng `/workspace/<tên kho>`. Owner hoặc admin (API key có `deployments:execute`) có thể thêm kho mã cho agent curated đã cài, bật hoặc tắt push hay quyền quản lý issue và pull request cho một kho agent đang có, hoặc gỡ một hay tất cả các kho, mà không cần plan mới. Xem [Gắn hoặc đổi kho mã của agent sau khi cài](/vi/guide/agent-repository-checkout#gan-hoac-doi-kho-ma-sau-khi-cai) để biết điều gì xảy ra trong `/workspace`.

```bash
tose templates repo list <installation-id>                                              # tên, nhánh, trạng thái, push, issue/PR, đường dẫn
tose templates repo add <installation-id> --repo acme/app --yes                         # thêm kho, chỉ đọc
tose templates repo add <installation-id> --repo acme/app --push --push-branches agent --yes
tose templates repo add <installation-id> --repo acme/app --github-api --yes            # bật issue và PR; push giữ nguyên
tose templates repo add <installation-id> --repo acme/app --no-github-api --yes         # tắt issue và PR
tose templates repo remove <installation-id> acme/app --yes                             # một kho; tệp vẫn ở trong /workspace
tose templates repo remove <installation-id> --all --yes                                # mọi kho
```

- `repo list` hiển thị mọi kho mã của agent cùng nhánh, commit, trạng thái, thiết lập push, quyền issue và pull request (`ISSUES/PRS`) và đường dẫn. Với `--json` là `{installation_id, repositories}`; mỗi kho có `github_api` và, khi bật, đường dẫn proxy `api_path`.
- `repo add` (cũng viết được là `repo set`) chọn `--repo` trong danh sách kho mà kết nối GitHub của bạn liệt kê, giống `plan`. `--commit` và `--github-installation` hoạt động như trong `plan`. Kho agent chưa có được thêm bên cạnh các kho khác; lệnh không bao giờ thay thế kho nào. `--branch` mặc định là nhánh mặc định của kho và `--push-branches` là `all`.
- Hai kho cùng tên không thể dùng chung thư mục: `REPOSITORY_FOLDER_TAKEN`, và bước tiếp theo gợi ý gỡ kho đang giữ thư mục đó. Agent đã có 10 kho bị từ chối với `REPOSITORY_LIMIT`; hãy gỡ bớt một kho trước.
- Với kho agent đang có, `repo add` đặt lại toàn bộ thiết lập push của kho đó: không có `--push` thì kho chỉ đọc, nên bỏ `--push` với kho agent đang push sẽ tắt push. `--push-branches all|agent` cần `--push`. Các thiết lập không được truyền giữ giá trị hiện có: nhánh đã clone, GitHub App installation, id của kho (kho khác trùng tên bị từ chối với `REPO_ID_CHANGED`) và, khi có `--push`, các nhánh được push, nên chỉ `--push` không bao giờ mở rộng agent đang giới hạn ở nhánh riêng. Nhánh khác của kho đã clone bị từ chối (`REPOSITORY_ALREADY_CLONED`; hãy đổi nhánh bằng git ngay trong agent), `--commit` cũng vậy.
- `--github-api` cho phép agent đọc và ghi issue và pull request của kho (tạo, bình luận, gắn nhãn, review) qua proxy GitHub API của TOSE; agent không bao giờ giữ GitHub token, và không thể merge, sửa nội dung hay thiết lập của kho. `--no-github-api` tắt quyền này. Khi không có cờ nào, kho agent đang có giữ thiết lập hiện tại, còn kho mới bắt đầu ở trạng thái tắt. Khi có một trong hai cờ mà không có `--push`, `--no-push` hay `--push-branches`, thiết lập push giữ nguyên; `--no-push` tắt push một cách tường minh, nên `--no-push --github-api` chỉ cấp quyền issue và pull request. Để bật, TOSE GitHub App cần quyền **Issues** và **Pull requests: Read and write**, đã được chấp nhận trên installation; nếu không, API trả `409 GITHUB_PERMISSION_MISSING` và CLI gợi ý một lệnh cho mỗi thiết lập mà yêu cầu đã bật, kèm tên quyền tương ứng. Plan không thể yêu cầu quyền này (`422`): hãy bật sau khi agent đã được cài. Xem [Issue và pull request](/vi/guide/agent-repository-checkout) để biết agent gọi proxy thế nào.
- `repo remove <installation-id> <owner/name>` gỡ đúng kho đó; `--all` gỡ mọi kho. Khi không có tên kho và không có `--all`, agent chỉ có một kho thì kho đó bị gỡ, còn agent có nhiều kho bị từ chối kèm danh sách tên để chọn.
- `add` và `remove` hỏi xác nhận, hoặc cần `--yes` trong script. Khi API trả `restart_required: true`, lệnh deploy lại agent ở chế độ image, việc này khởi động lại agent và dừng tác vụ đang chạy. Nếu lần deploy đó bị từ chối, thay đổi vẫn được lưu và lệnh thoát với mã `8` kèm lệnh `tose template deploy <slug> --mode image` cần chạy.
- Đầu ra hiển thị mọi kho (kho mới ở trạng thái `pending` cho tới khi lần deploy clone hoặc trỏ lại kho). Với `--json` là `{installation_id, repository, repositories, restart_required, deployment}`, trong đó `repository` là kho đầu tiên. Theo dõi lần khởi động lại bằng `tose templates wait <installation-id>`.
- Lỗi từ API giữ nguyên mã kèm bước tiếp theo: `REPOSITORY_CLONING`, `REPOSITORY_LIMIT`, `REPOSITORY_FOLDER_TAKEN`, `NOT_A_CLOUD_AGENT`, `INSTALLATION_DELETED`, `REPOSITORY_REQUIRES_PERSON`, `REPOSITORY_NOT_FOUND` (kho agent không có) và các mã của GitHub `BRANCH_MISSING`, `PERMISSION_DENIED`, `GITHUB_PERMISSION_MISSING`, ...

## Liên quan

- [Template registry](/vi/guide/template-registry)
- [API template registry](/vi/api/template-registry)
- [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers)
- [Triển khai một coding agent](/vi/guide/deploy-coding-agent)
