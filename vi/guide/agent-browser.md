---
title: "Agent browser"
description: "Phiên Chromium được host, cô lập, do người và AI agent điều khiển bằng thao tác có kiểu, có takeover, phê duyệt, danh sách site được phép và Site API map chỉ ghi metadata."
---

# Agent browser {#agent-browser}

::: warning Truy cập sớm
Agent browser và các tool MCP của nó đã bật trên production từ 2026-11-19. Một số phần tạm thời vẫn
tắt trên production: Site API map (kéo theo thao tác `fetch` và Action Map ghi), lưu body response,
chạy lại không cần browser, gợi ý của System One, và kiểm tra của lớp bảo vệ trên thao tác browser
thông thường. Tự phục hồi còn cần một cờ của nền tảng, mặc định tắt. Các tính năng ghi **Đã lên kế
hoạch** dưới đây chưa dùng được; trang này được cập nhật khi chúng ra mắt.
:::

Agent browser cho workspace một Chromium được host mà người hoặc AI agent điều khiển qua **thao tác
có kiểu** (navigate, snapshot, click, fill, press, extract...). Không có script tùy ý, không có
shell và không có quyền DevTools thô. Mỗi phiên chạy trong pod cô lập riêng, chỉ tới được các site
workspace cho phép, và tính phí theo thời gian chạy.

Dùng nó khi agent cần một trang web, không cần cả một máy. Khi người cần desktop Linux đầy đủ, dùng
[Cloud Desktop](/vi/guide/cloud-desktops). Khi site có API chính thức đáp ứng đủ nhu cầu, hãy gọi
API đó.

## Những gì đã có {#status}

| Khả năng | Trạng thái |
|---|---|
| Phiên: tạo, tạm dừng, chạy lại, kết thúc, sự kiện audit | Đã có ([REST](/vi/api/browsers), [CLI](/vi/commands/browser), dashboard; MCP tạo và đóng phiên) |
| Lease, người tiếp quản, chặn (fencing) lease cũ | Đã có |
| Thao tác có kiểu, snapshot gọn, lỗi có mã kèm `next_step` | Đã có (REST, CLI, MCP) |
| Phê duyệt cho `click`, `fill`, `press` do agent chạy | Đã có (owner hoặc admin đã đăng nhập duyệt qua REST hoặc trên trang duyệt của dashboard; MCP trả link tới trang đó) |
| Danh sách origin được phép của workspace và egress proxy | Đã có (đề xuất qua REST và CLI; admin đã đăng nhập xác nhận qua REST hoặc trên trang **Allowed sites** của dashboard) |
| Dashboard: danh sách browser, xem trực tiếp, tiếp quản, trang duyệt, site được phép | Đã có |
| Tool MCP cho browser kèm giao yêu cầu phê duyệt | Đã có ([tose-app#807](https://github.com/saasvn/tose-app/pull/807)) |
| Xem trực tiếp ngay trong chat (MCP Apps) | Đã có; việc tiếp quản diễn ra trên trang TOSE |
| Profile: vault, grant, chia sẻ, import, đăng nhập lại | Đã có (REST, dashboard, [CLI](/vi/commands/browser#profiles); chưa có tool MCP) |
| Companion cho Chrome trên máy | Import từ Chrome của bạn trên trang **Profiles** của dashboard ([tose-app#825](https://github.com/saasvn/tose-app/pull/825)); ghép nối thiết bị và điều khiển Chrome trên máy đã lên kế hoạch |
| Action recipe, lượt chạy lại bền vững, recipe receipt | Đã có (REST, trang **Recipes** của dashboard ([tose-app#825](https://github.com/saasvn/tose-app/pull/825)), [CLI](/vi/commands/browser#recipes); chưa có tool MCP để lưu hay chạy) |
| Recipe công khai | Đã có qua REST; admin nền tảng xét duyệt từng recipe trước khi đăng |
| Site API map (chỉ metadata) và thao tác `fetch` | Sau một cờ server, tắt trên production (REST, [CLI](/vi/commands/browser#site-api-map); MCP và CLI [tra cứu kiến thức](/vi/commands/browser#knowledge-lookup); chưa có trang dashboard) |
| Action Map ghi | Ở nơi Site API map chạy (REST, MCP, [CLI](/vi/commands/browser#write-action-maps)); người xác minh và duyệt qua REST |
| Chạy lại không cần browser | Sau một cờ server, tắt trên production (REST, MCP, [CLI](/vi/commands/browser#browserless-replay), danh sách trên dashboard) ([tose-app#831](https://github.com/saasvn/tose-app/pull/831)) |
| Tự phục hồi | Sau một cờ server mặc định tắt, cộng công tắc của workspace (recipe: REST, MCP, dashboard, [CLI](/vi/commands/browser#self-heal); Action Map: REST) ([tose-app#849](https://github.com/saasvn/tose-app/pull/849)) |
| Lớp bảo vệ | Đã có ([tose-app#858](https://github.com/saasvn/tose-app/pull/858)); luôn kiểm tra lệnh ghi của Action Map và tự phục hồi, còn thao tác browser thông thường chỉ được kiểm tra sau một cờ server đang tắt trên production |

Các lệnh CLI cho profile, recipe, Site API map, tra cứu kiến thức, Action Map và tự phục hồi có trong
bản `tose` phát hành sau 0.2.0.

## Phiên {#sessions}

Một phiên là một pod Chromium dùng xong bỏ. Trạng thái đi qua `provisioning`, `running`,
`suspending`, `suspended`, `failed`, `terminating` và `terminated`.

- **Tạo** với một tên (1 tới 40 chữ thường, chữ số hoặc dấu gạch ngang) và một server. Gửi header
  `Idempotency-Key` để lần tạo lặp lại trả về đúng phiên cũ thay vì mở pod thứ hai.
- **Kiểm tra trước khi tạo:** ví workspace phải còn số dư dương (nếu không là `402`) và workspace
  phải dưới giới hạn số phiên đồng thời (nếu không là `429`).
- **Tạm dừng** và **kết thúc** đều xóa pod. Không có ổ đĩa, không ngủ đông, nên phiên tạm dừng mất
  tab và cookie, trừ khi phiên được mở từ một [profile](#profiles) với `persist: true`, khi đó phiên
  lưu lại phiên đăng nhập trước. **Chạy lại** mở pod mới sau đúng các kiểm tra ví và giới hạn như khi tạo.
- **Tự ngủ:** phiên không có hoạt động sẽ tạm dừng sau khoảng 10 phút.
- **Ví hết tiền:** mọi browser của workspace bị tạm dừng.
- Không xóa được workspace khi còn phiên browser chưa kết thúc (`409`).

Mọi thay đổi vòng đời, lease và thao tác đều được ghi thành sự kiện của phiên. Sự kiện ghi loại
thao tác và mục tiêu, không bao giờ ghi chữ đã gõ, nội dung trang hay cookie.

## Lease, xem trực tiếp và tiếp quản {#leases}

**Lease** là quyền điều khiển một phiên. Lease có scope `observe` (xem) và/hoặc `act` (chạy thao
tác), hạn dùng được gia hạn theo hoạt động tới một mức tuổi tối đa, và **epoch** hiện tại của phiên.

- Tạo hoặc thu hồi lease làm tăng epoch. Mọi lease cũ hơn ngừng hoạt động ngay, kể cả luồng quan sát
  đang mở và thao tác đang chạy.
- **Người luôn được ưu tiên hơn agent.** Người đã đăng nhập có thể tiếp quản từ bất kỳ ai. Agent
  không bao giờ lấy quyền điều khiển từ người, và API key hay ứng dụng đã kết nối chỉ giữ được lease
  agent.
- Token lease đi trong header `X-Browser-Lease` cho thao tác và heartbeat, và là WebSocket
  subprotocol cho luồng quan sát. Token không bao giờ nằm trong URL.
- Khi lease không còn hiện hành, thao tác kế tiếp báo lý do:

| Mã | Ý nghĩa |
|---|---|
| `HUMAN_STEP_REQUIRED` | Người đã tiếp quản và vẫn đang giữ (ví dụ để đăng nhập hoặc giải thử thách). |
| `CONTROL_RETURNED` | Người đã tiếp quản rồi trả lại. Xin lease mới và chụp snapshot mới. |
| `LEASE_FENCED` | Một lease mới hơn hoặc lệnh thu hồi đã thay lease này. |

Thao tác mất kết nối, hoặc có lease hết hiệu lực khi đang chạy, báo `outcome_unknown`. Trang có thể
đã thay đổi: chụp snapshot trước khi làm lại.

**Xem trực tiếp trong dashboard:** trang của một phiên hiển thị browser theo thời gian thực và cho
người đã đăng nhập tiếp quản rồi trả lại.

### Xem trực tiếp trong chat (MCP Apps) {#mcp-apps}

Tool MCP cho browser trả về, cạnh kết quả dạng chữ, một giao diện MCP Apps mà các host như Claude và
ChatGPT hiển thị ngay trong chat. Giao diện cho thấy browser của agent theo thời gian thực. Khi agent
báo `HUMAN_STEP_REQUIRED` (đăng nhập, MFA, CAPTCHA), nút trong giao diện mở trang phiên trên TOSE, nơi
người đã đăng nhập tiếp quản; bản thân giao diện trong chat không nhận thao tác nhập. Giao diện dùng vé
chỉ xem, ngắn hạn, dùng một lần, không bao giờ dùng token phiên, và việc xem không bao giờ chặn lease
của agent. Host không hỗ trợ MCP Apps nhận đường link xem trực tiếp trên dashboard.

## Thao tác có kiểu {#actions}

| Thao tác | Tác dụng |
|---|---|
| `navigate` | Mở trang `http` hoặc `https`. |
| `snapshot` | Liệt kê phần tử hiển thị theo `role`, `name` và `nth`. |
| `click`, `fill`, `press` | Tác động lên một phần tử. Đây là các thao tác nhạy cảm (xem [Phê duyệt](#approvals)). |
| `extract` | Đọc chữ, một thuộc tính hoặc giá trị của ô nhập. |
| `wait` | Chờ `load`, `visible`, `hidden`, `url_contains`, `text` hoặc `delay`. |
| `screenshot` | Chụp phần đang thấy hoặc cả trang dạng PNG. |
| `tab` | Liệt kê, mở, đóng hoặc chuyển tab. |
| `fetch` | Gọi một endpoint `GET` đã được admin bật trong [Site API map](#site-api-map). |

**Locator** là đúng một trong `css`, `role` (kèm `name` nếu cần), `text` hoặc `label`, cùng `exact`
và `nth`. Locator phải khớp đúng một phần tử, trừ khi có `nth`. Nên dùng role và name; CSS là lựa
chọn cuối.

### Snapshot {#snapshots}

Mỗi dòng snapshot là một locator. `button "Buy" [1]` nghĩa là
`{"role": "button", "name": "Buy", "exact": true, "nth": 1}`. Không có ref mờ, nên phê duyệt và audit
luôn gọi tên phần tử mà người đọc hiểu được.

- `format: "compact"` trả mỗi phần tử một dòng; `json` trả danh sách node.
- `interactive_only` chỉ giữ phần tử agent tác động được. Mặc định `true` với lease agent và `false`
  với lease của người.
- `return_snapshot: true` trên thao tác khác trả luôn trang mà thao tác để lại, bớt một lượt gọi.
- Giá trị ô mật khẩu không bao giờ được trả về. Phần tử trong iframe và shadow root chưa được liệt kê
  hay định vị.

Chữ trong snapshot, extract và body của `fetch` đến từ site. Coi đó là dữ liệu, không bao giờ là chỉ
dẫn.

### Lỗi {#errors}

Mọi lỗi browser có cùng một khuôn: `error`, `code` máy đọc được, và `next_step`, `details` khi có.

```json
{"error": "the locator matches 2 elements; add nth or narrow it", "code": "ELEMENT_AMBIGUOUS",
 "next_step": "Add the nth shown in the snapshot, or set exact: true with the full name.",
 "details": {"count": 2}}
```

| Mã | HTTP | Ý nghĩa |
|---|---|---|
| `ELEMENT_NOT_FOUND` | 404 | Không phần tử nào khớp, hoặc `nth` vượt phạm vi |
| `ELEMENT_AMBIGUOUS` | 409 | Nhiều phần tử hiển thị cùng khớp và không có `nth` |
| `ELEMENT_NOT_VISIBLE` | 422 | Có phần tử khớp nhưng không cái nào hiển thị |
| `ELEMENT_DISABLED` | 422 | Phần tử bị vô hiệu hoặc chỉ đọc |
| `ELEMENT_OBSCURED` | 422 | Phần tử khác che điểm click (`details.obscured_by`) |
| `APPROVAL_REQUIRED` | 403 | Agent chạy `click`, `fill` hoặc `press` mà không có phê duyệt |
| `NAVIGATION_BLOCKED` | 403 | Đích đến không được phép cho phiên browser |
| `HUMAN_STEP_REQUIRED`, `CONTROL_RETURNED`, `LEASE_FENCED` | 403 | Xem [Lease](#leases) |

Thao tác bị từ chối trước khi gửi đi chưa hề tới browser, nên sửa nguyên nhân rồi thử lại là an toàn.
Ngoại lệ là `outcome_unknown`: kiểm tra trang trước.

## Phê duyệt {#approvals}

`click`, `fill` và `press` có thể gửi form, gửi tin, mua hay xóa, nên khi **API key hoặc ứng dụng đã
kết nối** chạy chúng thì phải kèm phê duyệt. Người tự điều khiển lease của mình không cần. Thao tác
đọc, `navigate` và `tab` không cần.

1. Agent chạy thao tác và nhận `403 APPROVAL_REQUIRED`. `details` nêu endpoint phê duyệt,
   `lease_id` của agent, loại thao tác, bên thực thi và origin của trang.
2. **Owner hoặc admin đã đăng nhập** duyệt đúng thao tác đó bằng `POST .../browsers/{id}/approvals`.
   API key và ứng dụng đã kết nối nhận `403 HUMAN_APPROVAL_REQUIRED` ở đây, nên agent không bao giờ
   tự duyệt thao tác của mình.
3. Agent chạy lại đúng thao tác đó với token `approval` nhận được.

Phê duyệt gắn với người duyệt, credential thực thi, workspace, phiên, thao tác cùng digest tham số, và
origin của trang. Mặc định hết hạn sau 10 phút (tối đa 15) và chỉ chạy một thao tác. Đổi bất kỳ tham
số nào, origin hay bên thực thi đều làm phê duyệt mất hiệu lực. Các lỗi từ chối là
`approval_invalid`, `approval_expired`, `approval_mismatch` và `approval_used`; phê duyệt bị từ chối
thì không bị tiêu.

Qua MCP, thao tác bị từ chối trả về `approval_url` dẫn tới trang duyệt trên dashboard, nơi owner hoặc
admin duyệt; sau đó agent chạy lại lời gọi với token `approval`. Công tắc theo origin của owner cho
production, thanh toán và thao tác phá hủy chưa được xây.

## Site được phép {#allow-list}

Browser của workspace chỉ tới được **origin đã xác nhận** khi chế độ chặn bật, và chế độ này bật cho
mọi workspace tới khi admin tắt. Vì vậy browser của workspace mới không tới được site bên thứ ba nào
cho tới khi có origin được xác nhận.

- Ai được điều khiển browser, kể cả agent, đều **đề xuất** được origin (`scheme://host[:port]`).
  Origin đó ở trạng thái `pending`.
- Chỉ **owner hoặc admin đã đăng nhập** mới xác nhận hay gỡ origin, hoặc bật tắt chế độ chặn. API key
  và ứng dụng đã kết nối nhận `403 HUMAN_APPROVAL_REQUIRED`. Mọi thay đổi đều được audit.
- Host nội bộ, dạng số và host bị chặn bị từ chối (`400`). Một workspace giữ tối đa 100 đề xuất đang
  chờ (`429 too_many_pending_origins`).
- Thay đổi áp dụng cho pod khởi động sau đó: tạm dừng rồi chạy lại phiên đang chạy để nhận thay đổi.
- Khi trang không tải, sự kiện của phiên có mục `egress_denied` nêu origin và lý do.

## Site API map và Action Map {#site-api-map}

Site API map cho agent gọi API đọc của chính site thay vì cào HTML. Nó tắt trừ khi server đặt
`BROWSER_API_MAP_ENABLED` (tắt trên production), và chỉ ghi khi danh sách được phép đang bật và chỉ cho origin đã xác nhận.

- **Những gì được ghi:** với các request `XHR` và `fetch` mà trang gửi, ghi origin, method, mẫu đường
  dẫn (đoạn giống ID thành `{id}`), **tên** tham số query, media type và status. Không bao giờ ghi
  body, giá trị header, cookie, giá trị query hay dữ liệu post.
- **Bật endpoint:** admin đã đăng nhập bật từng endpoint `GET`. Endpoint hết hạn 30 ngày sau lần cuối
  được thấy; endpoint thấy lại sau khi hết hạn bắt đầu lại ở trạng thái tắt.
- **Thao tác `fetch`** gọi endpoint đã bật từ trong tab hiện tại, nên mang cookie của trang mà cookie
  không tới TOSE hay agent. Tab phải đang ở đúng origin của endpoint, redirect không được theo, body
  giới hạn 256 KiB và được đánh dấu `untrusted: true`. Body là bất cứ gì site đã đăng nhập trả về; bật
  endpoint là quyết định của admin cho phép agent đọc response đó.
- **Tra cứu:** `GET .../browser-api-endpoints?url=<url>` liệt kê các endpoint `GET` đã biết của origin
  của URL đó, mẫu khớp đứng đầu.

Ngoài REST, CLI liệt kê endpoint bằng [`tose browser apimap`](/vi/commands/browser#site-api-map), và
**tra cứu kiến thức** (tool MCP `browser_knowledge_lookup`,
[`tose browser knowledge`](/vi/commands/browser#knowledge-lookup)) liệt kê những gì workspace đã biết
về một site: recipe, Action Map ghi đã xác minh và endpoint của Site API map. Dashboard chưa có trang
Site API map.

**Action Map ghi** gọi endpoint `POST`, `PUT`, `PATCH` hoặc `DELETE` của site từ trang của phiên với
tham số có kiểu, thay vì bấm qua form. Chúng chỉ có ở nơi Site API map ghi nhận endpoint. Người xác
minh từng phiên bản map qua REST. Mỗi lần gọi cần phê duyệt dùng một lần của owner hoặc admin đã đăng
nhập và một `Idempotency-Key`, và kết quả không rõ thành `needs_reconciliation` thay vì thử lại. Agent
liệt kê, xem trước và chạy map qua REST, MCP và [CLI](/vi/commands/browser#write-action-maps).

## Profile {#profiles}

Profile là phiên đăng nhập đã lưu cho một vài site. Mở phiên từ profile thì phiên bắt đầu ở trạng
thái đã đăng nhập; phiên mở với `persist: true` ghi lại phiên đăng nhập trước khi pod bị xóa. Quản lý
profile qua REST, trên trang **Profiles** của dashboard, hoặc bằng
[`tose browser profiles`](/vi/commands/browser#profiles). MCP chưa có tool cho profile.

- **Vault:** trạng thái đăng nhập của profile là `storageState` của các origin được phép (cookie và
  localStorage, không có IndexedDB, tối đa 256 KB), mã hóa trong kho credential của nền tảng. Không API, kết quả MCP, log hay lỗi nào trả về cookie hay token, và không có tính năng xuất
  trạng thái đăng nhập.
- **Grant:** dùng profile cần grant nêu tên profile và các origin được dùng. Có cookie không tự cho
  phép thao tác nào.
- **Ai được ghi profile:** mặc định chỉ lease của người. Owner có thể cho agent ghi theo từng profile.
- **Đăng nhập lại:** profile cần đăng nhập có thể được xác thực lại bằng credential từ broker, điền
  ngay trong pod sau khi người duyệt cú click gửi form; agent không bao giờ thấy giá trị. MFA, OTP hay CAPTCHA dừng lượt chạy với
  `HUMAN_STEP_REQUIRED` và link xem trực tiếp. TOSE không vượt CAPTCHA hay MFA.
- **Chia sẻ:** trong workspace qua grant có thời hạn. Giữa các workspace qua share grant do owner cấp:
  có thời hạn, được audit và thu hồi ngay được. Cookie không bao giờ bị sao chép; workspace nhận mở
  phiên chỉ đọc từ profile nguồn và tự trả phí.
- **Import:** người đã đăng nhập tải lên file `storageState` của Playwright (dashboard hoặc CLI) hoặc
  dùng companion bên dưới, không bao giờ qua prompt. Chỉ các origin được phép của profile được giữ.
- Tạo, import, cấp grant và chia sẻ cần người đã đăng nhập TOSE; API key nhận
  `HUMAN_APPROVAL_REQUIRED`.

### Companion cho Chrome trên máy {#companion}

Một extension Chrome cho người dùng lại phiên đăng nhập trong Chrome của mình mà không tải profile
Chrome lên. Trên trang **Profiles** của dashboard, người đó chọn *Import from my browser*, chọn một
origin của profile và cho phép đọc trong cửa sổ riêng của extension. Dashboard sau đó chỉ hiện metadata
(tên cookie, hạn, kích thước; không có giá trị) trước khi người đó tải lên. Extension chưa có trên
Chrome Web Store. Ghép nối thiết bị và cho agent dùng trực tiếp Chrome trên máy đã lên kế hoạch, chưa
xây.

Giới hạn đã biết: passkey và khóa bảo mật không bao giờ được sao chép, cookie gắn thiết bị chỉ dùng
được ít phút, thử thách SSO và 2FA cần người làm, và site gắn phiên với IP hay thiết bị có thể đăng
xuất bản sao.

## Recipe {#recipes}

Agent làm xong việc lưu các bước thành một recipe có tên và phiên bản. Lần sau nó chạy recipe mà
không cần model: locator của mỗi bước phải khớp đúng một phần tử và trang phải khớp trạng thái mong
đợi của bước, nếu không lượt chạy dừng với `RECIPE_DRIFT` và agent làm tiếp từng bước. Bước được ghi
không bao giờ giữ chữ đã gõ; giá trị điền thành tham số có tên.

Các bước ghi của một lượt chạy được duyệt bằng một **recipe receipt** dùng một lần cho một phiên bản
recipe, một bộ tham số, một origin và một bên thực thi, hạn ngắn. Bước nằm ngoài recipe vẫn cần phê
duyệt riêng, và không có phê duyệt cho cả origin.

Lượt chạy là bền vững: vẫn tiếp tục khi API hay client khởi động nó bị khởi động lại. Lượt chạy có bước
ghi có thể đã thực hiện sẽ kết thúc ở `needs_reconciliation` và không bao giờ được chạy lại. Agent tìm
và chạy recipe qua REST hoặc [`tose browser recipes`](/vi/commands/browser#recipes); trang **Recipes**
của dashboard liệt kê recipe và lịch sử lượt chạy. MCP chưa có tool để lưu hay chạy recipe.

**Recipe công khai** chỉ đọc, trên site công khai không cần đăng nhập, được admin nền tảng xét duyệt
trước khi đăng, và không mang dữ liệu của workspace nguồn. Mọi workspace đều tìm được và chạy chúng
trong phiên của mình, theo danh sách được phép của mình.

## Lớp bảo vệ và tự phục hồi {#guard}

- **Lớp bảo vệ:** nhận diện dữ liệu cá nhân (kể cả bộ nhận diện cho tiếng Việt) và bộ phân loại
  prompt injection chạy trong cluster, cùng một lớp kiểm tra thứ hai bằng decision model của workspace
  trên chữ đã che dữ liệu nhạy cảm. Lớp này luôn kiểm tra lệnh ghi của Action Map, chạy lại không cần
  browser và tự phục hồi. Nó chỉ kiểm tra thao tác browser thông thường và lượt chạy recipe khi server
  đặt `BROWSER_GUARD_ENFORCE`, đang tắt trên production. Bước được bảo vệ mà lỗi sẽ bị chặn với
  `GUARD_UNAVAILABLE` hoặc `GUARD_INJECTION`, mỗi mã kèm `next_step`.
- **Chạy lại không cần browser:** một Action Map ghi đã xác minh có thể được gửi từ API bằng phiên đăng
  nhập đã lưu của một profile, không cần phiên browser. Mỗi lần gọi cần phê duyệt riêng cho profile và
  bên thực thi đó, cùng một `Idempotency-Key`. Server phải đặt `BROWSER_HTTP_REPLAY_ENABLED`, đang tắt
  trên production; nếu không, lời gọi trả `HTTP_REPLAY_DISABLED`. Có qua REST, MCP và
  [`tose browser action-maps replay`](/vi/commands/browser#browserless-replay); dashboard liệt kê các
  lượt chạy lại ở trang **Self-heal and replays**.
- **Tự phục hồi:** khi lượt chạy recipe lệch vì một phần tử bị dời chỗ hay đổi tên, decision model của
  workspace chọn đúng phần tử đó trên trang và engine lưu bản sửa thành một phiên bản recipe mới. Action
  Map ghi có endpoint bị dời cũng được gắn lại theo cách tương tự. Mỗi lần thử có giới hạn theo ngày,
  được audit và có thể rollback. Cần cả cờ server `BROWSER_SELF_HEAL_ENABLED` (mặc định tắt) lẫn công
  tắc của workspace do owner hoặc admin đã đăng nhập bật. Tự phục hồi recipe có trên REST, MCP,
  dashboard và [`tose browser recipes heal`](/vi/commands/browser#self-heal); tự phục hồi Action Map
  chỉ có qua REST.

Các lớp kiểm soát khác nằm ở [Site được phép](#allow-list), [Phê duyệt](#approvals) và
[Mô hình bảo mật](#security).

## Giá và giới hạn {#pricing}

- **Compute:** theo [giá compute chuẩn](/vi/guide/pricing#compute) ($0,02 mỗi vCPU-giờ và $0,01 mỗi
  GB-giờ), tính theo thời gian pod chạy, từ lúc sẵn sàng tới khi bị xóa. Phiên 1 core và 2 GiB tốn
  khoảng 4¢ một giờ.
- **Cỡ tối thiểu:** 1 core mỗi phiên, vì mọi pod browser chạy dưới gVisor.
- **Chỉ trả trước:** phiên không khởi động được khi ví trống và bị tạm dừng khi ví hết. Không có nợ
  compute.
- **Tự ngủ** sau khoảng 10 phút không hoạt động, nên thời gian nhàn rỗi không bị tính.
- **Lưu trữ:** profile và trạng thái đăng nhập chưa bị tính phí; dự kiến sẽ được tính như lưu trữ.
- **Giới hạn:** số phiên đồng thời mỗi workspace có trần, mỗi pod chạy tối đa 12 giờ, timeout thao
  tác tới 30 giây, body `fetch` tới 256 KiB, 100 đề xuất origin đang chờ.

Xem [Bảng giá](/vi/guide/pricing) để biết ví hoạt động thế nào.

## Mô hình bảo mật {#security}

- **Cô lập:** mỗi phiên một pod trong namespace riêng của workspace, bắt buộc chạy dưới gVisor và
  Chromium vẫn bật sandbox riêng. Pod chạy non-root, bỏ mọi capability, root filesystem chỉ đọc và
  không có token service account. Phiên từ chối khởi động nếu không có lớp cô lập.
- **Không lộ cổng debug:** cổng DevTools của Chromium chỉ gắn vào loopback của pod và chỉ API của
  TOSE tới được. Bên gọi chỉ thấy thao tác có kiểu.
- **Cô lập tenant:** mọi truy vấn giới hạn trong workspace của bên gọi; phiên của workspace khác trả
  `404`.
- **Scope:** API key và ứng dụng đã kết nối cần grant `browser:read` hoặc `browser:control` rõ ràng
  (`browsers:read` và `browsers:write` vẫn được nhận như bí danh). Key cũ không có scope phải xin
  grant browser rõ ràng. `browser:auth:manage` dành riêng cho credential của profile và không cấp
  được.
- **Người trước:** agent không bao giờ lấy quyền điều khiển từ người, không tự duyệt thao tác của mình
  và không xác nhận được origin.
- **Không lộ bí mật:** token lease và token phê duyệt chỉ hiện một lần và không lưu dạng rõ; sự kiện
  và lỗi không chứa chữ đã gõ, nội dung trang hay cookie.
- **Trách nhiệm của bạn:** chỉ xác nhận site bạn được phép tự động hóa và tài khoản bạn sở hữu hoặc
  được ủy quyền. TOSE không vượt CAPTCHA, MFA hay giới hạn tần suất.

## Bước tiếp theo

- [Lệnh `tose browser`](/vi/commands/browser)
- [API Browsers](/vi/api/browsers)
- [API key và scope](/vi/api/api-keys)
