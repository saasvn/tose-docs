---
title: "Agent browser"
description: "Phiên Chromium được host, cô lập, do người và AI agent điều khiển bằng thao tác có kiểu, có takeover, phê duyệt, danh sách site được phép và Site API map chỉ ghi metadata."
---

# Agent browser {#agent-browser}

::: info Trên TOSE cloud
Agent browser, các trang dashboard và các tool MCP của nó (tại `https://app.tose.sh/mcp`) đã chạy
thật. [Site API map](#site-api-map) cùng thao tác `fetch` và việc ghi body response, Action Map ghi,
chạy lại không cần browser và [tự phục hồi](#guard) **đã bật trên TOSE cloud; mỗi workspace cần admin
thiết lập**: owner hoặc admin đã đăng nhập xác nhận origin, bật endpoint `GET`, xác minh Action Map,
duyệt lời gọi, bật công tắc tự phục hồi của workspace. Vẫn **chưa bật trên TOSE cloud**: gợi ý
System One và [lớp bảo vệ nội dung](#guard) cho thao tác browser và lượt chạy recipe. [Ghép thiết
bị](#pair-device) với Chrome companion đã bật trên TOSE cloud. [Bảng trạng thái](#status) nêu rõ từng phần.
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
| Phiên: tạo, tạm dừng, chạy lại, kết thúc, sự kiện audit | Đã có ([REST](/vi/api/browsers), MCP, dashboard; [CLI](/vi/commands/browser) mở, liệt kê, xem sự kiện và đóng phiên) |
| Lease, người tiếp quản, chặn (fencing) lease cũ | Đã có |
| Thao tác có kiểu, snapshot gọn, lỗi có mã kèm `next_step` | Đã có |
| Phê duyệt cho các thao tác nhạy cảm do agent chạy | Đã có (owner hoặc admin đã đăng nhập duyệt qua REST hoặc trang duyệt trên dashboard) |
| Yêu cầu phê duyệt đang chờ của một phiên | Đã có (REST, [`approvals`](/vi/commands/browser#approvals) của CLI, và trang phiên liệt kê chúng cho owner và admin) |
| Danh sách origin được phép của workspace và egress proxy | Đã có (đề xuất qua REST và CLI; admin đã đăng nhập xác nhận qua REST hoặc dashboard) |
| Dashboard: danh sách browser, xem trực tiếp, tiếp quản, trang duyệt, site được phép, profile, recipe | Đã có (trang tự phục hồi nằm ở dòng bên dưới) |
| [Trang phiên](#session-page): thanh địa chỉ, quay lại, tiến tới, tải lại, dừng, thao tác trực tiếp, tab, ảnh chụp màn hình, tệp tải xuống | Đã có (dashboard; các thao tác phía sau có trên REST và MCP) |
| [Theo dõi agent](#watch) từ dashboard | Đã có (dashboard, với vé xem từ REST) |
| Thao tác history, viewport, pointer, scroll, `type_text` và `download` | Đã có (REST, MCP); [`stop` và `download`](/vi/commands/browser#downloads) của CLI đã có tài liệu nhưng chưa nằm trong bản phát hành nào, các thao tác còn lại chưa có lệnh CLI |
| Tool MCP cho browser kèm giao yêu cầu phê duyệt | Đã có |
| Xem trực tiếp trong chat (MCP Apps) | Đã có; tiếp quản mở trang phiên trên dashboard |
| Profile: vault, grant, chia sẻ, import, đăng nhập lại | Đã có (REST, dashboard, CLI) |
| Companion cho Chrome trên máy | Đã có để import phiên đăng nhập từ dashboard |
| Ghép thiết bị với companion | Đã có ([ghép thiết bị](#pair-device) trên dashboard và helper `tose-companion`; liệt kê, đổi tên, thu hồi qua REST, MCP, [CLI](/vi/commands/browser) và dashboard); hiện chưa có gì dùng thiết bị đã ghép |
| Action recipe, lượt chạy lại bền vững, recipe receipt | Đã có (REST, dashboard, CLI) |
| Recipe công khai | Đã có (REST, và CLI [`recipes find`](/vi/commands/browser#recipes); admin nền tảng xét duyệt từng recipe trước khi đăng) |
| Tra cứu kiến thức và `goal` của snapshot | Đã có (REST, MCP, CLI); gợi ý System One chưa bật trên TOSE cloud |
| Lớp bảo vệ nội dung | Đã có cho thao tác ghi qua Action Map; cho thao tác browser và lượt chạy recipe thì chưa bật trên TOSE cloud |
| Site API map, thao tác `fetch` và ghi body response | Đã bật trên TOSE cloud; mỗi workspace cần admin thiết lập (REST, CLI; MCP qua `browser_knowledge_lookup`; dashboard là phần làm tiếp, [#810](https://github.com/saasvn/tose-app/issues/810)) |
| Action Map ghi và chạy lại không cần browser | Đã bật trên TOSE cloud; mỗi workspace cần admin thiết lập (REST, MCP, CLI) |
| Tự phục hồi recipe và Action Map | Đã bật trên TOSE cloud; mỗi workspace cần admin thiết lập và một decision provider (recipe: REST, MCP, dashboard, [CLI](/vi/commands/browser#self-heal); Action Map: chỉ REST, các bề mặt khác ở [#835](https://github.com/saasvn/tose-app/issues/835)) |

## Phiên {#sessions}

Một phiên là một pod Chromium dùng xong bỏ. Trạng thái đi qua `provisioning`, `running`,
`suspending`, `suspended`, `failed`, `terminating` và `terminated`.

- **Tạo** với một tên (1 tới 40 chữ thường, chữ số hoặc dấu gạch ngang) và một server. Gửi header
  `Idempotency-Key` để lần tạo lặp lại trả về đúng phiên cũ thay vì mở pod thứ hai.
- **Kiểm tra trước khi tạo:** ví workspace phải còn số dư dương (nếu không là `402`) và workspace
  phải dưới giới hạn số phiên đồng thời (nếu không là `429`).
- **Tạm dừng** và **kết thúc** đều xóa pod. Không có ổ đĩa, không ngủ đông, nên phiên tạm dừng mất
  tab và cookie. **Chạy lại** mở pod mới sau đúng các kiểm tra ví và giới hạn như khi tạo.
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

### Trang phiên {#session-page}

Trang phiên trên dashboard (`https://tose.sh/w/<workspace>/browsers/<session-id>`) hoạt động như một
trình duyệt:

- **Thanh địa chỉ** với **Quay lại**, **Tiến tới**, **Tải lại** và **Dừng tải**, kèm thanh tiến trình
  khi trang đang tải. Gõ địa chỉ như `example.com`; trang tự thêm `https://`.
- **Thao tác trực tiếp:** khi đang giữ quyền điều khiển, bạn click, cuộn và gõ ngay trên khung xem
  trực tiếp. Khi điều khiển, `Esc` rời khung xem, `Shift+Esc` gửi `Esc` vào trang, `Ctrl+L` sửa địa
  chỉ, còn `Alt+Trái` và `Alt+Phải` quay lại và tiến tới.
- **Thẻ:** chuyển, mở và đóng thẻ (tab) của phiên. Một menu liệt kê các trang gần đây của thẻ, và
  một nút chuyển giữa giao diện máy tính và giao diện di động.
- **Ảnh chụp màn hình:** lưu trang hiện tại dạng PNG.
- **Tệp tải xuống:** liệt kê những gì trang đã thử tải xuống. Tiếp quản để **Lưu** một tệp (xem
  [thao tác `download`](#downloads)).

Khi agent đang điều khiển, hãy tiếp quản để thấy thẻ, tệp tải xuống và ảnh chụp màn hình; riêng khung
xem trực tiếp của agent không hiện chúng. Khi không ai giữ phiên, chỉ cần **Xem trực tiếp** là thấy.
- **Đang chờ phê duyệt:** owner hoặc admin của workspace thấy các yêu cầu phê duyệt đang chờ của
  phiên, ai đã yêu cầu và khi nào mỗi yêu cầu hết hạn. **Xem chi tiết** mở
  [trang duyệt](#approvals) với mọi tham số; bản thân danh sách không bao giờ duyệt gì.
- **Hoạt động gần đây:** sự kiện của phiên, kể cả mỗi lần cấp quyền xem.

Lỗi được viết bằng lời dễ hiểu, mỗi lỗi kèm bước tiếp theo. Site chưa có trong
[site được phép](#allow-list) sẽ nói rõ và đưa ra **Đề xuất origin này** hoặc **Mở Trang được
phép**; địa chỉ riêng tư hoặc bị chặn, trang không tải được, trang phản hồi quá lâu, không còn trang
nào theo hướng đó, mất quyền điều khiển và thao tác cần phê duyệt đều nói bước cần làm tiếp.

### Theo dõi agent {#watch}

Khi agent đang điều khiển phiên, trang mở thẳng vào khung xem trực tiếp của nó. Trang làm việc này
bằng một **vé xem** ngắn hạn, dùng một lần, chỉ để xem, cấp cho người đã đăng nhập (cần
`browser.read`) qua `POST .../browsers/{browser_id}/watch`. Vé gắn với lease hiện tại của agent, nên
việc xem không bao giờ làm gián đoạn hay chặn agent, và vé không bao giờ là token lease hay token
phiên. Mỗi lần cấp đều được ghi thành sự kiện `watch`. Chỉ người mới xem được theo cách này: API key
nhận `403 person_required` và dùng khung xem trực tiếp của lease của chính nó.

- **Không ai giữ phiên:** trang hiện trạng thái của phiên, khung hình cuối và nút **Xem trực tiếp**.
  Trang không bao giờ tự giành quyền điều khiển. **Xem trực tiếp** mở một lease observe của bạn, nên
  trong lúc bạn xem, agent không thuê được phiên; agent tiếp tục khi bạn ngừng xem.
- **Lease của agent không cho xem:** trang nói rõ điều đó và đưa ra **Dừng agent**.
- **Dừng agent** và **Giành quyền điều khiển** đều hỏi xác nhận trước. Giành quyền điều khiển kết
  thúc lease của agent ngay; agent nhận `HUMAN_STEP_REQUIRED` cho tới khi bạn **Trả lại quyền điều
  khiển**, rồi nhận `CONTROL_RETURNED` ở lời gọi kế tiếp.

### Xem trực tiếp trong chat (MCP Apps) {#mcp-apps}

Tool MCP cho browser trả về, cạnh kết quả dạng chữ, một giao diện MCP Apps mà các host như Claude
và ChatGPT hiển thị ngay trong chat. Giao diện cho thấy browser của agent theo thời gian thực. Khi
agent báo `HUMAN_STEP_REQUIRED` (đăng nhập, MFA, CAPTCHA) hoặc bị kẹt, nút "Take over in TOSE" mở
trang phiên trên dashboard để người đã đăng nhập tiếp quản; bản thân giao diện không nhận thao tác
nhập. Giao diện dùng vé chỉ xem, ngắn hạn, dùng một lần, không bao giờ dùng token phiên, và việc xem
không bao giờ chặn agent. Host không hỗ trợ MCP Apps nhận `live_view_url`, đường link tới trang đó
trên dashboard.

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
| `history` | Trên tab hiện tại: `op` `list`, `back`, `forward`, `reload` hoặc `stop`. |
| `viewport` | Đặt tab hiện tại theo preset `desktop` (1280×800) hoặc `mobile` (390×844, cảm ứng). |
| `pointer` | Click tại `x`, `y` theo pixel CSS của viewport (`button`, `click_count` tới 3). Nhạy cảm. |
| `scroll` | Cuộn theo `delta_x`, `delta_y` tại một điểm. |
| `type_text` | Gõ `value` vào phần tử đang được focus. Nhạy cảm. |
| `download` | `op` `list` hoặc `get` kèm `id` (xem [Tệp tải xuống](#downloads)). |
| `fetch` | Gọi một endpoint `GET` đã được admin bật trong [Site API map](#site-api-map). |

`press` còn nhận `modifiers` (`ctrl`, `shift`, `alt`, `meta`). `history` `list` trả các trang của tab,
mọi mục trừ trang hiện tại đã được che, và chỉ cần scope observe. `back` và `forward` kiểm tra trang đích với
danh sách được phép và egress guard trước, và trả `not_actionable` khi không có trang đó. `stop` dừng
trang đang tải. `reload` có thể gửi lại form, nên là thao tác nhạy cảm.

**Locator** là đúng một trong `css`, `role` (kèm `name` nếu cần), `text` hoặc `label`, cùng `exact`
và `nth`. Locator phải khớp đúng một phần tử, trừ khi có `nth`. Nên dùng role và name; CSS là lựa
chọn cuối.

### Tệp tải xuống {#downloads}

Chromium không bao giờ ghi tệp vào pod. Thay vào đó, nó ghi lại những gì trang đã thử tải xuống.

- `download` với `op: "list"` trả `downloads: [{id, filename, url, state, started_at}]`, mới nhất
  trước, giá trị query trong URL đã được che. Chỉ cần scope observe.
- `op: "get"` kèm `id` tải lại đúng tệp đó từ tab hiện tại, qua danh sách được phép và egress guard,
  và trả `download: {filename, content_type, bytes, data_base64}`. Cần scope act, được tính là thao
  tác nhạy cảm, và giới hạn 10 MiB (`download_too_large`).
- Tệp đến từ site: coi nội dung của nó là không tin cậy.

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
| `APPROVAL_REQUIRED` | 403 | Agent chạy thao tác nhạy cảm mà không có phê duyệt |
| `NAVIGATION_BLOCKED` | 403 | Đích đến không được phép cho phiên browser |
| `HUMAN_STEP_REQUIRED`, `CONTROL_RETURNED`, `LEASE_FENCED` | 403 | Xem [Lease](#leases) |

Thao tác bị từ chối trước khi gửi đi chưa hề tới browser, nên sửa nguyên nhân rồi thử lại là an toàn.
Ngoại lệ là `outcome_unknown`: kiểm tra trang trước.

## Phê duyệt {#approvals}

Các thao tác nhạy cảm là `click`, `fill`, `press`, `pointer`, `type_text`, `history` `reload` và
`download` `get`. Chúng có thể gửi form, gửi tin, mua, xóa hay đưa dữ liệu ra ngoài, nên khi **API
key hoặc ứng dụng đã kết nối** chạy chúng thì phải kèm phê duyệt. Người tự điều khiển lease của mình
không cần. Thao tác đọc, `navigate`, `tab`, `scroll`, `viewport` và các thao tác `history`,
`download` còn lại không cần.

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

Qua MCP, lời từ chối kèm `approval_url` dẫn tới trang duyệt trên dashboard để người duyệt; sau đó
agent gửi lại đúng lời gọi đó với token `approval`. Công tắc theo origin của owner cho
production, thanh toán và thao tác phá hủy chưa được xây.

**Yêu cầu đang chờ:** `GET .../browsers/{id}/approval-requests` liệt kê các yêu cầu đang chờ, chưa
hết hạn của một phiên cho owner hoặc admin của workspace đăng nhập với tư cách một người: id, loại
thao tác, tóm tắt kèm origin của trang, credential nào đã yêu cầu, thời điểm tạo và hết hạn. Endpoint
không bao giờ trả tham số của thao tác, chữ đã gõ hay token. API key và ứng dụng đã kết nối nhận
`403 HUMAN_APPROVAL_REQUIRED`. [Trang phiên](#session-page) hiện cùng danh sách đó, và **Xem chi
tiết** mở trang duyệt; không có phê duyệt ngay trong danh sách.

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

Site API map cho agent gọi API đọc của chính site thay vì cào HTML. Nó **đã bật trên TOSE
cloud; mỗi workspace cần admin thiết lập**. Bản tự host bật nó bằng `BROWSER_API_MAP_ENABLED`. Nó chỉ
ghi khi danh sách được phép đang bật và chỉ cho origin đã xác nhận.

- **Những gì được ghi:** với các request `XHR` và `fetch` mà trang gửi, ghi origin, method, mẫu đường
  dẫn (đoạn giống ID thành `{id}`), **tên** tham số query, media type và status. Việc ghi body response thêm
  schema của response và một mẫu đã che dữ liệu. Không bao giờ ghi body thô, giá trị header, cookie,
  giá trị query hay dữ liệu post.
- **Bật endpoint:** admin đã đăng nhập bật từng endpoint `GET`. Endpoint hết hạn 30 ngày sau lần cuối
  được thấy; endpoint thấy lại sau khi hết hạn bắt đầu lại ở trạng thái tắt.
- **Thao tác `fetch`** gọi endpoint đã bật từ trong tab hiện tại, nên mang cookie của trang mà cookie
  không tới TOSE hay agent. Tab phải đang ở đúng origin của endpoint, redirect không được theo, body
  giới hạn 256 KiB và được đánh dấu `untrusted: true`. Body là bất cứ gì site đã đăng nhập trả về; bật
  endpoint là quyết định của admin cho phép agent đọc response đó.
- **Tra cứu:** `GET .../browser-api-endpoints?url=<url>` liệt kê các endpoint `GET` đã biết của origin
  của URL đó, mẫu khớp đứng đầu.

Map có qua REST và CLI (`tose browser apimap`); qua MCP, agent đọc nó bằng `browser_knowledge_lookup`.
Trang dashboard là phần làm tiếp ([#810](https://github.com/saasvn/tose-app/issues/810)).

**Action Map ghi** gọi endpoint ghi của site (`POST`, `PUT`, `PATCH`, `DELETE`) với tham số có kiểu
thay vì bấm qua form. Chúng chỉ có ở nơi Site API map ghi nhận endpoint, và admin đã đăng nhập xác minh từng map trước.
Mỗi lần gọi cần phê duyệt dùng một lần và một `Idempotency-Key`, và kết quả không rõ thành
`needs_reconciliation` thay vì thử lại. Mọi thao tác ghi đều qua [lớp bảo vệ nội dung](#guard) trước.
Lưu, xác minh và duyệt map vẫn do người làm qua REST; agent liệt kê, xem trước và chạy map qua MCP
hoặc CLI.

## Profile {#profiles}

Profile là phiên đăng nhập đã lưu cho một vài site: đăng nhập một lần, rồi mở các phiên đã đăng
nhập sẵn. Quản lý profile qua REST, trên dashboard (*Browsers → Profiles*) hoặc bằng
`tose browser profiles`; tool MCP cho profile chưa được xây. Phiên không dùng profile bắt đầu với
browser trống và mất trạng thái khi tạm dừng.

- **Vault:** trạng thái đăng nhập của profile là `storageState` của các origin được phép (cookie và
  localStorage, không có IndexedDB, tối đa 256 KB), mã hóa trong kho credential của nền
  tảng. Không API, kết quả MCP, log hay lỗi nào trả về cookie hay token, và không có tính năng xuất
  trạng thái đăng nhập.
- **Grant:** dùng profile cần grant nêu tên profile và các origin được dùng. Có cookie không tự cho
  phép thao tác nào.
- **Ai được ghi profile:** mặc định chỉ lease của người. Owner có thể cho agent ghi theo từng profile.
- **Đăng nhập lại:** profile cần đăng nhập có thể được xác thực lại bằng credential từ broker, điền
  ngay trong pod; agent không bao giờ thấy giá trị. MFA, OTP hay CAPTCHA dừng lượt chạy với
  `HUMAN_STEP_REQUIRED` và link xem trực tiếp. TOSE không vượt CAPTCHA hay MFA.
- **Chia sẻ:** trong workspace qua grant có thời hạn. Giữa các workspace qua share grant do owner cấp:
  có thời hạn, được audit và thu hồi ngay được. Cookie không bao giờ bị sao chép; workspace nhận mở
  phiên chỉ đọc từ profile nguồn và tự trả phí.
- **Import:** qua form bảo mật hoặc companion, không bao giờ qua prompt. Import nguyên thư mục profile
  Chrome bị từ chối.

### Companion cho Chrome trên máy {#companion}

Một extension Chrome cho người dùng lại phiên đăng nhập trong Chrome của mình mà không tải profile
lên. Trên *Browsers → Hồ sơ đăng nhập*, họ chọn *Nhập từ trình duyệt của tôi*, chọn một origin của profile và xác
nhận trong cửa sổ đồng ý riêng của extension; extension chỉ đọc trạng thái của origin đó và chỉ trả
lời dashboard TOSE. Có thể [ghép thiết bị](#pair-device) với helper `tose-companion`. Giới hạn đã
biết: passkey và khóa bảo mật không bao giờ được sao chép, cookie gắn thiết bị chỉ dùng được ít phút,
thử thách SSO và 2FA cần người làm, và site gắn phiên với IP hay thiết bị có thể đăng xuất bản sao.

#### Ghép thiết bị {#pair-device}

Ghép thiết bị đăng ký một máy với helper `tose-companion`. Tính năng đã bật trên TOSE cloud
(`BROWSER_COMPANION_PAIRING_ENABLED`). Hiện chưa có gì dùng thiết bị đã ghép: việc ghép chuẩn bị cho
các tính năng helper vẫn đang ở mức thiết kế, chưa được xây.

1. Người đã đăng nhập mở *Browsers → Devices*, đặt tên thiết bị và bấm *Pair a device*. TOSE hiển thị
   một lần mã dùng một lần (`XXXX-XXXX`), có hiệu lực 5 phút; đoán sai 5 lần thì mã bị huỷ.
2. Trên thiết bị, chạy `tose-companion pair --code XXXX-XXXX`. Helper hiện workspace và tài khoản của
   mã trước, rồi hỏi có tiếp tục không. Sau đó helper tạo khoá Ed25519, giữ khoá riêng trong kho khoá
   của hệ điều hành (DPAPI trên Windows, Keychain trên macOS, Secret Service trên Linux; không có kho
   khoá thì từ chối ghép, không bao giờ lưu ra file thường), nhận mã và in dấu vân tay khoá.
3. Chính người đó gõ dấu vân tay ấy vào dòng thiết bị và xác nhận. Dashboard không bao giờ hiện dấu vân
   tay trước khi xác nhận, nên chỉ lấy được mã thì không kích hoạt được thiết bị. Lượt nhận mã chưa xác
   nhận hết hạn sau 15 phút.

Mọi yêu cầu sau đó của helper đều được ký kèm thời điểm và một nonce dùng một lần. Trên thiết bị,
`tose-companion status` hiện thiết bị đã ghép và `tose-companion unpair` thu hồi nó.

| Quản lý thiết bị | Dashboard | REST | MCP | CLI |
|---|---|---|---|---|
| Liệt kê | *Browsers → Devices* | `GET .../browser-devices` | `browser_devices_list` | `tose browser devices list` |
| Đổi tên | Dòng thiết bị | `PATCH .../browser-devices/{id}` | `browser_devices_rename` | `tose browser devices rename` |
| Thu hồi | Dòng thiết bị | `POST .../browser-devices/{id}/revoke` | `browser_devices_revoke` | `tose browser devices revoke` |

Bắt đầu và xác nhận ghép chỉ dành cho người; agent nhận `HUMAN_APPROVAL_REQUIRED`. Agent được liệt kê,
đổi tên và thu hồi thiết bị của người dùng mà nó đại diện (`browser:read` để liệt kê,
`browser:control` để thay đổi). Chủ thiết bị, hoặc owner hay admin của workspace, có thể thu hồi; yêu
cầu đã ký của thiết bị bị từ chối ngay, còn phiên đăng nhập đã lưu không bị xoá. Mọi lần bắt đầu, nhận
mã, xác nhận, đổi tên và thu hồi đều nằm trong audit log. Helper cũ hơn phiên bản tối thiểu của server
(`BROWSER_COMPANION_MIN_VERSION`, mặc định `0.1.0`) bị từ chối với `DEVICE_CLIENT_TOO_OLD`.

## Recipe {#recipes}

Agent làm xong việc lưu
các bước thành một recipe có tên và phiên bản. Lần sau nó chạy recipe mà không cần model: locator của
mỗi bước phải khớp đúng một phần tử và trang phải khớp trạng thái mong đợi của bước, nếu không lượt
chạy dừng với `RECIPE_DRIFT` và agent làm tiếp từng bước. Bước được ghi không bao giờ giữ chữ đã gõ;
giá trị điền thành tham số có tên.

Các bước ghi của một lượt chạy được duyệt bằng một **recipe receipt** dùng một lần cho một phiên bản
recipe, một bộ tham số, một origin và một bên thực thi, hạn ngắn. Bước nằm ngoài recipe vẫn cần phê
duyệt riêng, và không có phê duyệt cho cả origin.

**Tra cứu kiến thức:** trước khi thao tác trên một site, agent hỏi site đó có những recipe đã lưu,
Action Map đã xác minh và endpoint nào (`browser_knowledge_lookup` qua MCP, `tose browser knowledge`
trong CLI). Snapshot có thể kèm `goal`, khi đó câu trả lời có thêm `goal_assessment`. Gợi ý dựa trên
model ở cả hai chỗ (System One) chưa bật trên TOSE cloud, nên chúng báo lý do `off`.

**Recipe công khai** chỉ đọc, trên site công khai không cần đăng nhập, được admin nền tảng xét duyệt
trước khi đăng, và không mang dữ liệu của workspace nguồn. Mọi workspace thấy cùng một danh mục và
chạy recipe công khai trong phiên của chính mình, theo danh sách được phép của chính mình.

## Lớp bảo vệ, chạy lại và tự phục hồi {#guard}

- **Lớp bảo vệ nội dung:** bộ phân loại prompt injection chạy cục bộ, một lớp kiểm tra trên chữ đã
  che dữ liệu nhạy cảm bằng decision model của workspace, và nhận diện dữ liệu cá nhân (kể cả bộ nhận
  diện cho tiếng Việt), chạy trong cluster. Trên TOSE cloud, lớp này bảo vệ thao tác ghi qua Action
  Map. Thao tác ghi mà lớp bảo vệ không kiểm tra được sẽ bị từ chối (`GUARD_UNAVAILABLE`); ở workspace
  chưa có decision model, thao tác ghi có điểm phân loại sạch vẫn chạy và được đánh dấu degraded, và
  thêm decision model sẽ khôi phục kiểm tra đầy đủ. Trang trống hoặc không có chữ không bị từ chối vì không đọc được. Nghi ngờ injection bị từ chối với
  `GUARD_INJECTION`; người luôn có thể tiếp quản phiên. Bảo vệ mọi thao tác browser và bước recipe đã
  xây nhưng chưa bật trên TOSE cloud.
- **Chạy lại không cần browser:** Action Map đã xác minh có thể chạy lại bằng HTTP qua egress proxy,
  không mở browser. Đã bật trên TOSE cloud.
- **Tự phục hồi:** khi một bước recipe hay endpoint của Action Map bị lệch, engine đề xuất bản vá, có
  công tắc theo workspace, giới hạn theo ngày, audit và rollback. Cờ nền tảng đã bật trên TOSE cloud;
  owner hoặc admin đã đăng nhập vẫn phải bật công tắc workspace, và workspace cần một decision
  provider. Tự phục hồi Action Map hiện chỉ có qua REST
  ([#835](https://github.com/saasvn/tose-app/issues/835)).

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
- **Giới hạn:** số phiên đồng thời mỗi workspace có trần, mỗi pod chạy tối đa 12 giờ, timeout thao
  tác tới 30 giây, body `fetch` tới 256 KiB, tệp tải xuống tới 10 MiB, 100 đề xuất origin đang chờ.

Xem [Bảng giá](/vi/guide/pricing) để biết ví hoạt động thế nào.

## Mô hình bảo mật {#security}

- **Cô lập:** mỗi phiên một pod trong namespace riêng của workspace, bắt buộc chạy dưới gVisor và
  Chromium vẫn bật sandbox riêng. Pod chạy non-root, bỏ mọi capability, root filesystem chỉ đọc và
  không có token service account. Phiên từ chối khởi động nếu không có lớp cô lập.
- **Không có tệp trên pod:** Chromium không bao giờ lưu tệp tải xuống; tệp được tải lại khi có yêu
  cầu, tới 10 MiB, dưới dạng dữ liệu không tin cậy.
- **Không lộ cổng debug:** cổng DevTools của Chromium chỉ gắn vào loopback của pod và chỉ API của
  TOSE tới được. Bên gọi chỉ thấy thao tác có kiểu.
- **Cô lập tenant:** mọi truy vấn giới hạn trong workspace của bên gọi; phiên của workspace khác trả
  `404`.
- **Scope:** API key và ứng dụng đã kết nối cần grant `browser:read` hoặc `browser:control` rõ ràng
  (`browsers:read` và `browsers:write` vẫn được nhận như bí danh). Key cũ không có scope phải xin
  grant browser rõ ràng. `browser:auth:manage` dành riêng cho credential của profile và không cấp
  được.
- **Người trước:** agent không bao giờ lấy quyền điều khiển từ người, không tự duyệt thao tác của
  mình, không liệt kê được yêu cầu phê duyệt đang chờ, không xác nhận được origin và không xem được từ
  dashboard.
- **Không lộ bí mật:** token lease và token phê duyệt chỉ hiện một lần và không lưu dạng rõ; sự kiện
  và lỗi không chứa chữ đã gõ, nội dung trang hay cookie.
- **Trách nhiệm của bạn:** chỉ xác nhận site bạn được phép tự động hóa và tài khoản bạn sở hữu hoặc
  được ủy quyền. TOSE không vượt CAPTCHA, MFA hay giới hạn tần suất.

## Bước tiếp theo

- [Lệnh `tose browser`](/vi/commands/browser)
- [API Browsers](/vi/api/browsers)
- [API key và scope](/vi/api/api-keys)
