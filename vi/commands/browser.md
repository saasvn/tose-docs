# tose browser

::: warning Chưa có trong bản phát hành
`tose browser` đã vào CLI sau bản 0.2.0, bản phát hành mới nhất, và sẽ có trong bản kế tiếp; trước đó
hãy build CLI từ mã nguồn. Bản thân [agent browser](/vi/guide/agent-browser) đã chạy trên TOSE cloud.
Site API map, write Action Map, browserless replay và self-heal đã bật ở đó, mỗi workspace cần admin
thiết lập; System One chưa bật. Khi một cờ server tắt, API báo như vậy và lệnh thất bại với thông báo
đó.
:::

Chạy phiên Chromium dùng xong bỏ, cô lập, và điều khiển trang bằng thao tác có kiểu (không script,
không shell). `<session>` nhận tên hoặc id phiên. Mọi lệnh con hỗ trợ `--json`.

```bash
tose browser open web --server <server-id> --wait --url https://example.com
tose browser snapshot web                    # mỗi dòng role "name" [nth] là một locator
tose browser click web --role link --name "More information"
tose browser fill web --label Email --value you@example.com
printenv SITE_PASSWORD | tose browser fill web --label Password --value-stdin
tose browser press web Enter --label Search --snapshot
tose browser extract web --css h1 --all
tose browser screenshot web --out page.png --full-page
tose browser stop web                        # dừng trang đang tải
tose browser download list web               # những gì trang đã thử tải xuống
tose browser download get web <id> --out report.pdf
tose browser approvals web                   # yêu cầu phê duyệt đang chờ (owner hoặc admin đã đăng nhập)
tose browser allowlist propose https://docs.example.com
tose browser close web
```

## Phiên

### tose browser open

```bash
tose browser open <name> --server <id> [--cpu <cpu>] [--ram <ram>] [--wait] [--timeout <seconds>] \
  [--url <url>] [--idempotency-key <key>]
```

| Tùy chọn | Mô tả |
|--------|-------------|
| `--server <id>` | Server chạy phiên (bắt buộc) |
| `--cpu <cpu>` | Số core, ít nhất 1 (mặc định của workspace nếu bỏ trống) |
| `--ram <ram>` | RAM, ví dụ `2Gi` (mặc định của workspace nếu bỏ trống) |
| `--wait` | Chờ tới khi phiên chạy |
| `--timeout <seconds>` | Với `--wait`: bỏ cuộc sau số giây này (mặc định 300) |
| `--url <url>` | Với `--wait`: mở trang này khi phiên đã chạy |
| `--idempotency-key <key>` | Lặp lại cùng key để nhận lại đúng phiên cũ thay vì phiên thứ hai |

Tên gồm chữ thường, chữ số và dấu gạch ngang.

### tose browser list / inspect / events

```bash
tose browser list
tose browser inspect <session>
tose browser events <session>
```

`events` hiện sự kiện audit về vòng đời, lease và thao tác: loại thao tác và mục tiêu, không bao giờ
có chữ đã gõ.

### tose browser close

```bash
tose browser close <session>
```

Kết thúc phiên, trả compute và quên lease. Phiên là đồ dùng xong bỏ; không giữ lại gì. Phiên cũng tự
ngủ sau 10 phút không hoạt động.

## Điều khiển trang

### Locator

`click`, `fill`, `press` và `extract` nhận đúng một locator:

| Tùy chọn | Mô tả |
|--------|-------------|
| `--role <role>` | Role của phần tử, ví dụ `button`, `link`, `textbox`, `checkbox` |
| `--name <name>` | Tên truy cập, dùng với `--role` (khớp chuỗi con trừ khi có `--exact`) |
| `--text <text>` | Chữ hiển thị của phần tử |
| `--label <label>` | Nhãn của ô nhập |
| `--css <selector>` | CSS selector (lựa chọn cuối; nên dùng `--role` và `--name`) |
| `--nth <n>` | Chọn phần tử nào khi nhiều phần tử khớp, tính từ 0 (snapshot có ghi) |
| `--exact` | Khớp `--name` chính xác |

Dòng snapshot `button "Save" [1]` nghĩa là `--role button --name Save --nth 1`.

### tose browser navigate

```bash
tose browser navigate <session> <url> [--snapshot] [--timeout <ms>]
```

Mở trang `http` hoặc `https`. `--snapshot` liệt kê luôn trang vừa tới.

### tose browser snapshot

```bash
tose browser snapshot <session> [--full] [--format compact|json] [--goal <text>]
```

Liệt kê các phần tử tác động được, mỗi phần tử một dòng `role "name" [nth]`. `--full` liệt kê mọi
phần tử hiển thị; `--format json` trả danh sách node.

`--goal "<text>"` (tối đa 300 ký tự) hỏi thêm System One xem trang đã cho thấy mục tiêu chưa:
`goal_assessment` trả `goal_met` (`yes`, `no` hoặc `unsure`) và trạng thái trang (`ok`,
`login_required`, `captcha`, `modal`, `error_page`). Nó đọc chữ không tin cậy từ trang, nên hãy xác
nhận trước khi hành động theo. Khi System One tắt, `system_one.reason` cho biết vì sao không có câu
trả lời.

### tose browser click / fill / press

```bash
tose browser click <session> <locator> [--approval <token>] [--snapshot] [--timeout <ms>]
tose browser fill <session> <locator> (--value <text> | --value-stdin) [--approval <token>] [--snapshot] [--timeout <ms>]
tose browser press <session> <key> [<locator>] [--approval <token>] [--snapshot] [--timeout <ms>]
```

`--value` hiện trong lịch sử shell; dùng `--value-stdin` cho dữ liệu bí mật. `--snapshot` trả trang
mà thao tác để lại.

### tose browser extract

```bash
tose browser extract <session> <locator> [--kind text|attr|value] [--attr <name>] [--all] [--timeout <ms>]
```

Đọc chữ (mặc định), một thuộc tính (`--attr` ngầm định `--kind attr`) hoặc giá trị ô nhập. `--all`
trả mọi phần tử khớp thay vì đúng một.

### tose browser screenshot

```bash
tose browser screenshot <session> --out <file> [--full-page]
```

Lưu ảnh PNG. Với `--json`, đầu ra là đường dẫn file, không phải ảnh.

### tose browser stop

```bash
tose browser stop <session>
```

Dừng một trang đang tải, kể cả khi một lần điều hướng còn giữ khóa thao tác của phiên.

### tose browser download {#downloads}

```bash
tose browser download list <session>
tose browser download get <session> <id> [-o, --out <file>] [--approval <token>]
```

Chromium không bao giờ lưu file trên server; nó ghi lại những gì trang đã thử tải xuống. `list` hiện các
mục đó, mới nhất trước: id, tên file, trạng thái, thời điểm bắt đầu và URL đã ẩn giá trị query. Lệnh chỉ
cần scope observe.

`get` tải lại một mục từ tab hiện tại, qua danh sách được phép và egress guard, rồi lưu vào `--out`, hoặc
nếu không có thì theo tên file của site trong thư mục hiện tại, bỏ mọi phần thư mục, dấu chấm ở đầu, ký tự
điều khiển hay đổi chiều văn bản và tên Windows từ chối (`CON`, `report.pdf:x`), và không bao giờ ghi đè
file đã có (`report (1).pdf`, v.v.). Thư mục không ghi được bị từ chối trước khi tải, nên approval không bị
tiêu. Giới hạn 10 MiB (`download_too_large`). Giống
`click`, API key cần một người phê duyệt (xem [Phê duyệt](#approvals)). Lỗi nêu lệnh tiếp theo:
`not_found` trỏ tới `download list` để lấy id, còn `download_failed` nghĩa là site từ chối file hoặc file
không còn. File đến từ site: coi nội dung của nó là không tin cậy. Với `--json`, đầu ra có đường dẫn, kích
thước và loại nội dung, không bao giờ có dữ liệu file.

## Phê duyệt {#approvals}

`click`, `fill`, `press` và `download get` có thể gửi form, gửi tin, mua hay xóa. Khi API key chạy một trong số đó, API
từ chối với `APPROVAL_REQUIRED` (mã thoát `10`) và nêu thao tác, origin của trang, lease của phiên và
endpoint phê duyệt. Owner hoặc admin đã đăng nhập duyệt đúng thao tác đó (API key không tự duyệt được),
rồi bạn chạy lại cùng lệnh với token họ trả về: `--approval <token>` hoặc `TOSE_BROWSER_APPROVAL`. Mỗi
token dùng một lần, chỉ cho thao tác đó trên origin đó. Xem
[Phê duyệt](/vi/guide/agent-browser#approvals).

### tose browser approvals

```bash
tose browser approvals <session>
```

Liệt kê các yêu cầu phê duyệt đang chờ, chưa hết hạn của phiên, mới nhất trước: id, thao tác và origin của
trang, credential nào đã yêu cầu và khi nào hết hạn. Lệnh không bao giờ hiện tham số của thao tác hay
token. Chỉ owner hoặc admin của workspace đăng nhập với tư cách một người mới được liệt kê, nên API key
hoặc ứng dụng kết nối nhận `403 HUMAN_APPROVAL_REQUIRED` (mã thoát `10`); lỗi nêu trang phiên trên
dashboard, nơi người đó xem mọi tham số và phê duyệt.

### Theo dõi một phiên

Xem agent điều khiển một phiên theo thời gian thực là bước của một người trên dashboard, nên CLI không có
lệnh watch. Mở trang phiên: `https://tose.sh/w/<workspace>/browsers/<session-id>`.

## Danh sách được phép

```bash
tose browser allowlist list
tose browser allowlist propose <origin>
```

Mặc định browser của workspace tới được mọi site công khai; địa chỉ riêng tư và nội bộ vẫn bị chặn.
Owner hoặc admin đã đăng nhập có thể bật **Chỉ cho phép các trang đã xác nhận**; khi đó browser chỉ tới
được origin đã xác nhận. `list` hiện công tắc và từng origin; `propose` đề xuất một origin và để nó ở `pending`. Xác nhận hay gỡ origin là việc
của owner hoặc admin đã đăng nhập trên dashboard, nên CLI không có lệnh cho việc đó.

## Profile {#profiles}

Profile giữ phiên đăng nhập của một site (cookie và storage) để agent không phải gõ lại mật khẩu.
Trạng thái đã lưu được mã hóa trong TOSE và không bao giờ được in ra.

```bash
tose browser profiles list
tose browser profiles create <name> --origin <origin> [--origin <origin>...] [--health-url <url>] [--agent-write]
tose browser profiles import <profile> --file <state.json|->
tose browser profiles share <profile> --with <type:id> --hours <n>
tose browser profiles grants <profile>
tose browser profiles unshare <profile> <grant-id>
tose browser profiles delete <profile> [--yes]
```

| Lệnh | Mô tả |
|------|-------|
| `list` | Profile của workspace và profile được chia sẻ cho nó |
| `create` | Profile rỗng, giới hạn trong các origin đã cho. `--health-url` là trang cho biết đăng nhập còn dùng được không; `--agent-write` cho agent click và gõ trên các site này bằng đăng nhập đó (mặc định tắt) |
| `import` | Nạp một Playwright storageState (tối đa 256 KB, `-` đọc từ stdin). Chỉ giữ các origin của profile và chỉ trả về số cookie giữ lại và bỏ đi |
| `share` | Cấp cho một người (`user:<id>`), API key (`api_key:<id>`), ứng dụng đã kết nối (`oauth:<id>`) hoặc workspace khác (`workspace:<id>`) trong `--hours` giờ |
| `grants` / `unshare` | Liệt kê quyền đã cấp và chia sẻ, hoặc chấm dứt một quyền; phiên mở qua quyền đó kết thúc ngay |
| `delete` | Xóa profile và đăng nhập đã lưu; `--yes` để xác nhận trong script |

Mọi lệnh trừ `list` và `grants` cần một người đã đăng nhập: API key nhận `HUMAN_APPROVAL_REQUIRED`.

## Tra cứu hiểu biết {#knowledge-lookup}

```bash
tose browser knowledge --origin <url> [--intent <text>]
```

Liệt kê những gì workspace đã biết về một site: recipe, write Action Map đã xác minh và endpoint của
Site API map (tối đa 20 mỗi loại), kèm `next_step`. `--origin` nhận site hoặc bất kỳ URL nào trên đó.
Với `--intent` (tối đa 500 ký tự) và System One bật, `suggested` gợi ý một recipe hoặc Action Map hợp
với việc cần làm. Không có gì được chạy; lệnh cần scope `browser:read`. Hãy xem ở đây trước khi làm
từng bước trên một site.

## Recipe {#recipes}

Recipe chạy lại các bước đã lưu trên một site mà không cần model.

```bash
tose browser recipes find <url>
tose browser recipes list [--origin <origin>]
tose browser recipes run <recipe> --session <session> [--param name=value] [--secret-param name=SECRET_NAME] \
  [--mode sync|async|stream] [--wait-seconds <n>] [--recipe-version <n>] [--approval <token>] [--idempotency-key <key>]
tose browser recipes runs [run-id] [--recipe <recipe-id>]
tose browser recipes cancel <run-id>
```

| Tùy chọn của `run` | Mô tả |
|--------------------|-------|
| `--session <session>` | Phiên browser bạn đang giữ để chạy |
| `--param <name=value>` | Giá trị cho một tham số; không bao giờ in ra (lặp lại cho nhiều tham số) |
| `--secret-param <name=SECRET>` | Lấy giá trị tham số từ secret của workspace theo tên; API tự giải |
| `--mode <mode>` | `sync` chờ (mặc định), `async` trả run ngay, `stream` in từng bước |
| `--wait-seconds <n>` | Với `sync`: chờ tối đa chừng này (mặc định 30, tối đa 60) |
| `--recipe-version <n>` | Chạy phiên bản này thay vì bản mới nhất |
| `--approval <token>` | Phê duyệt cho recipe có click, gõ hoặc nhấn phím khi API key chạy (hoặc `TOSE_BROWSER_APPROVAL`) |
| `--idempotency-key <key>` | Chạy lại với cùng key trả về cùng run |

`find` liệt kê recipe chạy được cho một origin hoặc URL, recipe đã xác minh đứng trước. Run kết thúc
ở `drift`, `failed` hoặc `needs_reconciliation` thoát với mã `8` và `RECIPE_DRIFT`,
`RECIPE_RUN_FAILED` hoặc `RECIPE_NEEDS_RECONCILIATION`; làm tiếp từng bước từ `tose browser
snapshot`, hoặc thử [self-heal](#self-heal) khi bị drift. `runs <run-id>` hiện một run kèm nhật ký
từng bước. `cancel` dừng run đang chờ hoặc đang chạy; run đã bắt đầu ghi sẽ kết thúc ở
`needs_reconciliation`.

## Recipe self-heal {#self-heal}

```bash
tose browser self-heal [get|on|off]
tose browser recipes heal <run-id>
tose browser recipes heals <recipe>
tose browser recipes heal-rollback <heal-id>
```

Self-heal vá một bước khi phần tử của nó bị dời chỗ hoặc đổi tên. Nó chỉ chạy khi cả cờ của nền tảng
và công tắc của workspace đều bật. `tose browser self-heal` hiện công tắc, cờ nền tảng và giới hạn
mỗi ngày; `on` và `off` dành cho owner hoặc admin đã đăng nhập.

- `recipes heal <run-id>` dùng cho run kết thúc ở `drift` (`RECIPE_DRIFT`) trên phiên bản mới nhất
  của recipe, và lấy act lease trên phiên của run. Engine đưa ra các phần tử cùng role trên trang,
  model quyết định của workspace chọn một, và các bước đã vá được lưu thành phiên bản nháp mới.
- Không có bản vá an toàn thì lệnh thoát với mã `10`, `HUMAN_STEP_REQUIRED` và `next_step` của API:
  làm nốt bước đó bằng tay rồi lưu lại recipe.
- `recipes heals <recipe>` liệt kê các lần thử, mới nhất trước, kèm kết quả và khác biệt của locator.
- `recipes heal-rollback <heal-id>` đưa các bước cũ trở lại thành phiên bản kế tiếp khi phiên bản đã
  vá vẫn là mới nhất. Sau khi có bản lưu mới hơn, API trả `SELF_HEAL_ROLLBACK_STALE`. Lệnh dành cho
  owner hoặc admin đã đăng nhập.
- API key chạy `self-heal on|off` hoặc `heal-rollback` nhận `HUMAN_APPROVAL_REQUIRED` (mã thoát `10`).
  Các mã khác: `SELF_HEAL_DISABLED`, `SELF_HEAL_NOT_DRIFT`, `SELF_HEAL_RATE_LIMITED`.

## Site API map {#site-api-map}

```bash
tose browser apimap list [--origin <origin>] [--url <url>]
tose browser apimap enable <endpoint-id>
tose browser apimap disable <endpoint-id>
```

`list` hiện các endpoint GET mà browser đã thấy trên các site được phép: chỉ tên, không bao giờ có giá
trị. Với `--url`, lệnh liệt kê các endpoint đã biết của trang đó. `enable` cho thao tác `fetch` gọi một
endpoint và `disable` ngừng việc đó; cả hai dành cho owner hoặc admin đã đăng nhập, nên API key nhận
`HUMAN_APPROVAL_REQUIRED`.

## Write Action Map {#write-action-maps}

Một người soạn và xác minh map trên một endpoint POST, PUT, PATCH hoặc DELETE của Site API map trong
dashboard. CLI liệt kê, xem trước và gửi các map đã xác minh.

```bash
tose browser action-maps list [--origin <origin>]
tose browser action-maps preview <map> [--session <session>] [--param name=value]
tose browser action-maps execute <map> --session <session> --param name=value --approval <token> [--idempotency-key <key>]
tose browser action-maps run <run-id>
tose browser action-maps runs [--transport http|page] [--map <map-id>] [--limit <n>]
```

- `<map>` là id của map, hoặc tên để dùng phiên bản đã xác minh mới nhất. `list` hiện mọi phiên bản.
- `preview` kiểm tra tham số và hiện lời gọi mà không gửi.
- `execute` gửi lời gọi từ trang của một phiên browser bạn đang giữ. Mỗi lời gọi cần một phê duyệt do
  owner hoặc admin đã đăng nhập tạo cho đúng các tham số đó (`--approval` hoặc
  `TOSE_BROWSER_APPROVAL`); không có thì API trả `APPROVAL_REQUIRED` kèm ID yêu cầu phê duyệt. API key
  không tự duyệt lời gọi của chính nó được.
- CLI tự tạo `Idempotency-Key` khi bạn không truyền và in nó ra. Chạy lại với cùng key và tham số trả
  về run đầu tiên (`replayed`) thay vì gửi lại.
- Run `rejected` (4xx), `failed` hoặc `needs_reconciliation` thoát với mã `8` và
  `ACTION_MAP_REJECTED`, `ACTION_MAP_FAILED` hoặc `NEEDS_RECONCILIATION`.
- `run` hiện một run, `runs` liệt kê run từ phiên (`--transport page`) và từ browserless replay
  (`--transport http`), mới nhất trước (`--limit` 1-100, mặc định 50): trạng thái, mã HTTP, lỗi và
  transport, không bao giờ có giá trị hay phản hồi.
- CLI không in giá trị tham số; xem [Lease và đầu ra](#leases-and-output). Phản hồi
  của site là dữ liệu không tin cậy.

### Browserless replay {#browserless-replay}

```bash
tose browser action-maps replay <map> --profile <profile> [--param name=value] [--approval <token>] [--idempotency-key <key>]
```

Gửi một lời gọi đã xác minh từ API bằng cookie đã lưu của profile, không cần phiên browser. Lệnh cần
`BROWSER_HTTP_REPLAY_ENABLED` trên API (đã bật trên TOSE cloud, mặc định tắt khi tự host); nếu không, lời gọi trả `HTTP_REPLAY_DISABLED`,
khi đó hãy dùng `execute` từ một phiên.

1. Chạy lệnh không có `--approval`. Không gì được gửi: API trả `APPROVAL_REQUIRED` (mã thoát `10`), và
   CLI in executor, profile và endpoint phê duyệt, kèm lệnh để chạy lại với `--approval` và cùng
   idempotency key.
2. Owner hoặc admin đã đăng nhập tạo phê duyệt ở đó cho đúng profile, executor và tham số đó.
3. Chạy lại với `--approval <token>` và cùng `--idempotency-key`.

Phê duyệt cho phiên không bao giờ chạy được replay, và ngược lại. Các lý do từ chối khác:
`PROFILE_UNAVAILABLE` (dùng profile bạn sở hữu hoặc được cấp, có origin chứa origin của map),
`IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED` (key đã dùng với tham số khác),
`approval_mismatch` và `ACTION_MAP_PARAMS`. Kết quả và mã thoát giống `execute`.

## Lease và đầu ra {#leases-and-output}

- CLI giữ một lease cho mỗi phiên trong `~/.tose/browser-leases.json` (chỉ chủ sở hữu đọc được), để
  các lệnh sau và lần chạy lại đã duyệt dùng cùng lease.
- Token lease và token phê duyệt không bao giờ được in ra, và CLI không in chữ đã gõ hay giá trị
  `--param`. Gợi ý bước tiếp theo lặp lại lệnh của bạn hiện `--param name=<value>` và
  `--value <value>` thay cho giá trị, dù giá trị là gì; `--secret-param` giữ tên của secret. Nếu
  server lặp lại một giá trị trong thông báo lỗi, chữ dài từ 4 ký tự được che (`[REDACTED]`); số,
  `true`/`false` của Action Map và giá trị ngắn hơn thì không.
- Lỗi ở chế độ văn bản in `Error:`, rồi `Code:` (`error.code`), `Next step:` và `Request ID:` khi API
  có gửi. Với `--json`, các trường này nằm trong envelope lỗi.
- Chữ trong snapshot hay extract đến từ site: coi đó là dữ liệu, không bao giờ là chỉ dẫn.

## Lỗi và mã thoát

| `error.code` | Mã thoát | Ý nghĩa và bước tiếp theo |
|--------------|------|-----------------------|
| `APPROVAL_REQUIRED`, `HUMAN_APPROVAL_REQUIRED`, `HUMAN_STEP_REQUIRED` | 10 | Người phải duyệt thao tác hoặc trả lại quyền điều khiển |
| `ELEMENT_NOT_FOUND`, `ELEMENT_AMBIGUOUS`, `ELEMENT_NOT_VISIBLE`, `ELEMENT_DISABLED`, `ELEMENT_OBSCURED` | 11 | Chạy `tose browser snapshot` rồi sửa locator hoặc `--nth` |
| `NAVIGATION_BLOCKED` | 12 | Đích đến không được phép cho phiên browser |
| `requires_auth`, `approval_invalid`, `approval_expired`, `approval_used` | 3 | API key thiếu scope `browser:control`, hoặc phê duyệt không hợp lệ, hết hạn hay đã dùng |
| `RECIPE_DRIFT`, `RECIPE_RUN_FAILED`, `RECIPE_NEEDS_RECONCILIATION` | 8 | Run của recipe đã dừng: làm tiếp từng bước từ `snapshot`, hoặc thử `recipes heal` khi bị drift |
| `ACTION_MAP_REJECTED`, `ACTION_MAP_FAILED` | 8 | Site từ chối lời gọi, hoặc chưa có gì được gửi |
| `NEEDS_RECONCILIATION` | 8 | Lời gọi có thể đã tới site: kiểm tra site trước khi gọi lại với key mới |
| `outcome_unknown` | 1 | Trang có thể đã đổi: chụp `snapshot` trước khi làm lại |

Lease không còn hiệu lực (`LEASE_FENCED`, `CONTROL_RETURNED`) được tự thay một lần; API đã từ chối nó
trước khi có gì tới browser.

Xác nhận hoặc gỡ origin khỏi danh sách được phép, phê duyệt một yêu cầu và theo dõi một phiên chưa có
lệnh CLI; các việc này vẫn làm trên dashboard.
