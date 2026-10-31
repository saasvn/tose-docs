# Cloud Desktop

Cloud Desktop là một máy tính Ubuntu (giao diện XFCE) chạy lâu dài trong workspace TOSE của bạn.
Bạn có thể dùng nó ngay trên trình duyệt như một máy tính bình thường, và một AI agent có thể điều
khiển chính desktop đó qua REST API: chụp màn hình, click, gõ phím, chạy lệnh terminal, đọc và ghi
file.

Các trường hợp sử dụng điển hình:

- Một hồ sơ trình duyệt dùng lâu dài cho agent (đăng nhập, cookie và extension được giữ lại sau
  mỗi lần khởi động lại).
- Một không gian làm việc chung: agent làm việc, con người vào kiểm tra hoặc giành quyền điều khiển
  khi cần.
- Một máy phát triển bền vững nhưng không tốn chi phí tính toán khi đang ngủ.

::: info Tính khả dụng
Cloud Desktop được bật theo từng bản cài đặt TOSE. Nếu các endpoint `desktops` trả về 404 cho
workspace của bạn, tính năng này chưa được bật.
:::

## Cách hoạt động

Mỗi desktop có:

- **Một ổ đĩa lưu trữ lâu dài** được gắn tại `/home/ubuntu`. Mọi thứ bạn lưu trong thư mục home,
  kể cả hồ sơ trình duyệt, đều được giữ nguyên qua các lần ngủ và đánh thức.
- **Tài nguyên tính toán** (CPU và RAM) chỉ tồn tại khi desktop đang chạy.
- **Một quyền điều khiển (control lease) duy nhất** dùng chung giữa con người và agent. Ai giữ
  quyền này thì được gửi thao tác nhập liệu; những người khác vẫn có thể xem.

### Các trạng thái vòng đời

| Trạng thái | Ý nghĩa |
|------------|---------|
| `provisioning` | Đang tạo ổ đĩa và tài nguyên |
| `starting` | Desktop đang khởi động |
| `running` | Sẵn sàng sử dụng, đang tính phí tính toán |
| `sleeping` | Đã giải phóng tài nguyên tính toán, giữ lại ổ đĩa |
| `sleeping_failed` | Lần cho ngủ chưa hoàn tất; hãy chạy lại `sleep` |
| `waking` | Đang khởi động lại trên chính ổ đĩa cũ |
| `error` | Có lỗi xảy ra; xem `last_error` và nhật ký sự kiện |
| `deleting` | Đang xóa desktop và ổ đĩa của nó |

Mỗi thay đổi vòng đời (tạo, đánh thức, cho ngủ, xóa) là một **operation** có id và trạng thái
riêng (`pending`, `running`, `succeeded`, `failed`). Mỗi desktop chỉ chạy một operation tại một
thời điểm. Gửi lại lệnh wake (hoặc sleep) khi một operation đang chạy sẽ trả về chính operation đó
thay vì tạo operation mới, nên việc thử lại là an toàn.

## Tạo desktop

Bạn cần vai trò **admin** trong workspace và id của server sẽ chạy desktop.

Bằng CLI:

```bash
tose desktop create dev --server <server-id> --cpu 2 --ram 4 --disk 20 \
  --resolution 1920x1080 --auto-sleep 30
```

Bằng API:

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=ws_your_api_key
export WS=my-workspace

curl -X POST "$TOSE_API/api/workspaces/$WS/desktops" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "name": "dev",
    "server_id": "<server-id>",
    "cpu": "2",
    "ram": "4",
    "disk_size_gi": 20,
    "resolution": "1920x1080",
    "auto_sleep_minutes": 30
  }'
```

Yêu cầu trả về `202 Accepted` kèm `{desktop, operation}`. Hãy theo dõi operation (hoặc chạy
`tose desktop status dev`) cho đến khi desktop ở trạng thái `running`.

Nếu không tạo được ổ đĩa, quá trình khởi tạo sẽ thất bại và desktop chuyển sang `error`; desktop
không bao giờ khởi động khi thiếu ổ đĩa lưu trữ lâu dài.

## Ngủ và đánh thức

**Sleep (ngủ)** dừng phần tính toán của desktop và giải phóng CPU, RAM. Ổ đĩa được giữ lại.

**Wake (đánh thức)** khởi động lại desktop trên **chính ổ đĩa cũ** với cùng danh tính: file, các
gói đã cài trong thư mục home và hồ sơ trình duyệt vẫn ở nguyên chỗ bạn để lại.

::: warning Không ngủ đông RAM
Chế độ ngủ không lưu bộ nhớ. Các cửa sổ đang mở, tài liệu chưa lưu và tiến trình đang chạy sẽ mất
khi desktop ngủ. Hãy lưu công việc xuống đĩa trước. Sau khi đánh thức, desktop khởi động mới từ ổ
đĩa của nó.
:::

```bash
tose desktop sleep dev --wait
tose desktop wake dev --wait
```

Tự động ngủ: khi đặt `auto_sleep_minutes`, desktop không có hoạt động trong khoảng thời gian đó
(tính bằng phút) sẽ tự động được cho ngủ.

### Tính phí

- **Tính toán** được tính phí theo từng giây desktop chạy. Sau khi xác nhận đã ngủ, phí tính toán
  dừng lại.
- **Ổ đĩa được tính phí chừng nào desktop còn tồn tại**, dù đang chạy hay đang ngủ. Hãy xóa
  desktop để dừng phí ổ đĩa.

## Điều khiển bởi con người và agent

Truy cập vào một desktop đang chạy đều thông qua một **session (phiên)**. Session được tạo với
một loại người điều khiển:

- `human`: một người dùng desktop trong dashboard (trình xem VNC trên trình duyệt).
- `agent`: một chương trình hoặc AI agent dùng các REST action.

Mỗi desktop có **một quyền điều khiển duy nhất**. Session đang giữ quyền này có thể gửi thao tác
nhập liệu (click, gõ, phím tắt, cuộn, terminal, ghi file). Các thành viên khác vẫn có thể xem màn
hình và dùng các thao tác chỉ đọc như `screenshot` và `file.read`.

### Giành quyền điều khiển (takeover)

Để giành quyền điều khiển khi người khác đang giữ, hãy tạo session với `"takeover": true`. Người
giữ trước đó mất quyền và các thao tác nhập liệu của họ sẽ bị từ chối từ thời điểm đó. Đây là cách
con người vào hỗ trợ agent (ví dụ giải một bước xác minh đăng nhập) và cách agent tiếp tục làm việc
sau đó.

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"controller": "human", "takeover": true}'
```

Khi xong việc, hãy xóa session để trả lại quyền điều khiển.

## Điều khiển desktop từ agent

1. Đảm bảo desktop đang ở trạng thái `running` (đánh thức nếu cần).
2. Tạo một agent session.
3. Gửi các action kèm `session_id`.
4. Xóa session.

```bash
DESKTOP_ID=<desktop-id>

# 1. Mở agent session
SESSION_ID=$(curl -s -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"controller": "agent"}' | jq -r '.session.id')

ACTIONS="$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/actions"

# 2. Chụp màn hình (trả về {image_base64, mime})
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"screenshot\"}" \
  | jq -r '.image_base64' | base64 -d > screen.png

# 3. Click, gõ chữ và nhấn phím
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"click\", \"x\": 640, \"y\": 360}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"type\", \"text\": \"hello\"}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"key\", \"keys\": \"ctrl+s\"}"

# 4. Chạy lệnh terminal (trả về {stdout, stderr, exit_code})
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"terminal.exec\", \"command\": \"ls -la ~\", \"timeout_seconds\": 30}"

# 5. Ghi và đọc file trong /home/ubuntu
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"file.write\", \"path\": \"/home/ubuntu/notes.txt\", \"content_base64\": \"$(printf 'hi' | base64)\"}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"file.read\", \"path\": \"/home/ubuntu/notes.txt\"}" \
  | jq -r '.content_base64' | base64 -d

# 6. Đóng session
curl -s -X DELETE "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions/$SESSION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

CLI hỗ trợ sẵn các trường hợp phổ biến và tự quản lý session cho bạn:

```bash
tose desktop screenshot dev --out screen.png
tose desktop exec dev -- ls -la /home/ubuntu
```

Xem [tài liệu API Desktops](/api/desktops#actions) (tiếng Anh) để biết đầy đủ các action và tham
số.

## Bảo mật

- **VNC thô không bao giờ được công khai.** Desktop không có địa chỉ công khai. Luồng màn hình chỉ
  đến được với bạn thông qua gateway session của TOSE.
- **Session dùng token ngắn hạn.** Khi tạo session, bạn nhận một token gắn với chính session đó;
  gateway chỉ chấp nhận token này, và token hết hiệu lực khi hết hạn hoặc khi session bị xóa. Hãy
  giữ token như mật khẩu và không chia sẻ.
- **Nhập liệu cần quyền điều khiển.** Chỉ session đang giữ quyền điều khiển mới được gửi thao tác
  nhập liệu.
- **Truy cập file bị giới hạn** trong `/home/ubuntu`; các đường dẫn bên ngoài sẽ bị từ chối.
- Desktop chạy với cấu hình container được gia cố, và lưu lượng mạng đi ra tới dịch vụ metadata
  của cloud và mạng nội bộ đều bị chặn.
- Các thay đổi vòng đời được ghi vào [nhật ký sự kiện](/commands/desktop#tose-desktop-events) của
  desktop.

## Lưu giữ dữ liệu

- **Desktop không bao giờ bị xóa tự động.** Desktop và ổ đĩa của nó chỉ bị xóa khi admin của
  workspace chủ động xóa và xác nhận bằng tên desktop.
- **Số dư thấp chỉ khiến desktop ngủ.** Nếu workspace hết tiền, các desktop đang chạy sẽ được cho
  ngủ để dừng phí tính toán. Ổ đĩa được giữ lại, và bạn có thể đánh thức desktop sau khi nạp thêm
  tiền.
- Không thể xóa workspace khi vẫn còn desktop bên trong. Hãy xóa các desktop trước.

## Liên quan

- [Lệnh `tose desktop`](/commands/desktop) (tiếng Anh)
- [Tài liệu API Desktops](/api/desktops) (tiếng Anh)
