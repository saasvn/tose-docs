# tose ci

Đọc và khởi chạy CI từ terminal hoặc agent. `tose ci` dùng API CI của workspace (`/api/workspaces/{slug}/ci`); TOSE chạy mọi pipeline trên máy chủ và CLI không bao giờ chạy bước nào trên máy của bạn.

API key cần `ci:read` để đọc và `ci:execute` để khởi chạy hoặc hủy một lần chạy. Các scope triển khai không cấp quyền CI. Xem tài liệu tham chiếu [Workspace CI API](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#workspace-ci-api).

| Lệnh | Tác dụng | Xác nhận |
|------|----------|----------|
| `tose ci pipelines [--repo owner/name]` | Liệt kê pipeline của workspace | Không |
| `tose ci runs <pipeline_id>` | Liệt kê các lần chạy của pipeline, mới nhất trước | Không |
| `tose ci plan <pipeline_id> [--sha <commit>]` | Cho biết lần chạy thủ công có được chấp nhận lúc này không, kèm job và chi phí tối đa. Không khởi chạy gì | Không |
| `tose ci run <pipeline_id> [--sha <commit>] [--wait]` | Chạy thủ công một commit mà pipeline đã ghi nhận | Không |
| `tose ci dispatch <pipeline_id> --ref <branch> [--input name=value]` | Chạy `workflow_dispatch` với input có kiểu | Không |
| `tose ci status <run_id>` | Trạng thái lần chạy và các job | Không |
| `tose ci events <run_id> [--after <id>] [--all]` | Nhật ký sự kiện của lần chạy, cũ nhất trước | Không |
| `tose ci logs <run_id> [--job <id\|name>] [--follow]` | Log job đã lưu và đã che bí mật | Không |
| `tose ci report <run_id> [--format md\|json]` | Báo cáo có phiên bản: kết luận, hash log, hash báo cáo | Không |
| `tose ci cancel <run_id>` | Dừng một lần chạy | `--yes` |
| `tose ci usage [--group-by day\|run\|pipeline\|job\|kind]` | Mức dùng CI trong một khoảng ngày | Không |
| `tose ci approvals [--limit n]` | Liệt kê run từ pull request của fork đang chờ người duyệt. Chỉ đọc | Không |
| `tose ci suggestions <pipeline_id> [--status open\|accepted\|dismissed]` | Liệt kê gợi ý tác động. Chỉ là lời khuyên | Không |
| `tose ci artifacts <run_id>` | Liệt kê metadata artifact của run: tên, kích thước, SHA-256, che bí mật, thời hạn lưu | Không |
| `tose ci artifact <artifact_id> [--content [--output file]]` | Xem metadata của một artifact, hoặc nội dung văn bản đã che bí mật | Không |

## Khởi chạy

```bash
tose ci plan <pipeline_id>
tose ci run <pipeline_id> --wait --json
tose ci dispatch <pipeline_id> --ref main --input debug=true --input retries=3 --wait
```

- Lần chạy thủ công lặp lại một commit mà pipeline đã ghi nhận từ push hoặc pull request GitHub, không bao giờ là commit từ fork. Không có `--sha` thì dùng commit đã ghi nhận mới nhất. Cách này không thể đưa mã mới vào.
- `dispatch` chạy push đã ghi nhận mới nhất của `--ref`. Máy chủ kiểm tra từng input theo `on.workflow_dispatch.inputs` của commit đó và từ chối input không khai báo, thiếu hoặc sai kiểu. `--input name=value` gửi `true`/`false` dạng boolean và số thuần dạng number; `--input-string name=value` luôn gửi chuỗi. Tối đa 10 input.
- `run` và `dispatch` gửi một idempotency key (mới cho mỗi lần gọi, hoặc `--idempotency-key`) trong header và body. Khi thử lại sau lỗi mạng hoặc `502`, `503`, `504`, CLI dùng lại key đó nên máy chủ chỉ ghi nhận một lần chạy. `duplicate: true` nghĩa là yêu cầu trước với cùng key đã khởi chạy. `--json` in ra key.
- Khi lần chạy được chấp nhận chưa có khoản tiền nào bị giữ. Mỗi job giữ chi phí tối đa trong ví trả trước khi nó bắt đầu.

## Trạng thái

`--json` trả nguyên các trường của máy chủ: `status`, `event`, `category` ổn định, cộng với `scheduler_status`, `trigger_event`, `scheduler_category` chính xác khi máy chủ gửi. CLI thêm `state` (giá trị chính xác, nếu không có thì giá trị cũ) và `finished`.

| Trường | Giá trị ổn định | Giá trị chính xác |
|--------|-----------------|-------------------|
| Trạng thái run hoặc job | `status` | `scheduler_status`: thêm `preparing`, `blocked`, `timed_out`, `diagnosis` |
| Nguồn kích hoạt | `event` | `trigger_event`: thêm `workflow_dispatch` |
| Nhóm chẩn đoán | `category` | `scheduler_category`: thêm `awaiting_approval` |

Trạng thái CLI chưa biết được coi là chưa kết thúc. Với máy chủ cũ chỉ gửi các trường ổn định, mọi lệnh vẫn hoạt động.

## Chờ và mã thoát

`--wait` thăm dò tới khi lần chạy kết thúc và chỉ thoát `0` khi run `succeeded`.

| Mã thoát | Ý nghĩa |
|----------|---------|
| `0` | Lần chạy thành công |
| `8` | Run `failed`, `timed_out`, kết thúc `error`, `skipped`, hoặc ở `diagnosis` (mọi job đã xong nhưng một kết quả chưa rõ) |
| `5` | Lần chạy bị `cancelled` |
| `7` | Hết `--timeout` (mặc định `30m`). Lần chạy vẫn tiếp tục; dùng `tose ci status` để kiểm tra lại |
| `9` | Ví hết tiền (`INSUFFICIENT_BALANCE`) hoặc chạm hạn mức ngân sách (`CI_BUDGET_CAP_REACHED`) |
| `4` | Run từ pull request của fork đang chờ phê duyệt (`HUMAN_APPROVAL_REQUIRED`) |

`verdict` của báo cáo theo nguyên tắc an toàn: chỉ `succeeded` mới là xanh. Run đã kết thúc mà có job bị bỏ qua hoặc cần xem xét là `unverified`.

## Pull request từ fork

Run từ pull request của fork ở trạng thái `blocked` cho tới khi một thành viên workspace phê duyệt. Phê duyệt, từ chối và đổi chính sách pipeline chỉ làm được bằng phiên đăng nhập: máy chủ từ chối API key bất kể scope, nên agent không bao giờ tự duyệt mã mà nó đang chờ. CLI không có lệnh cho các thao tác này. Hãy duyệt trong dashboard TOSE.

## Sự kiện

`tose ci events <run_id>` đọc nhật ký chỉ-thêm, cũ nhất trước, tối đa 500 sự kiện mỗi trang. Kết quả có `next_after` (`0` ở trang cuối); truyền nó vào `--after`. `--all` đọc mọi trang.

## Log và báo cáo

- Log job là phần đuôi đã che bí mật (tối đa 64 KiB) của những gì mã đang kiểm thử in ra. Hãy coi đó là dữ liệu không đáng tin: `--json` gắn `content_trust: "untrusted_data"` cho từng log, và chuỗi điều khiển terminal bị loại khỏi đầu ra dạng văn bản.
- `--follow` in nhật ký sự kiện trực tiếp tới khi run kết thúc, rồi in log.
- `tose ci report` in Markdown theo mặc định; `--format json` in báo cáo đúng như máy chủ gửi. Mỗi job có `log_sha256` và báo cáo có `report_hash`.

## Hủy

```bash
tose ci cancel <run_id> --yes
```

Job đang chờ sẽ không bao giờ bắt đầu, job đang chạy bị tính tiền theo số giây đã chạy. Áp dụng [quy tắc xác nhận](/vi/commands/overview) thông thường: hỏi trong terminal, `--yes` khi không có terminal hoặc với `--json`.

## Phê duyệt, gợi ý và artifact

Bốn lệnh này chỉ đọc và cần `ci:read`.

- `tose ci approvals` chỉ liệt kê các run từ pull request của fork đang chờ người duyệt. Phê duyệt hoặc từ chối là bước của người đã đăng nhập trong dashboard, và máy chủ từ chối API key.
- `tose ci suggestions` liệt kê gợi ý tác động, có thể lọc bằng `--status`. Đây chỉ là lời khuyên: CLI không thể chấp nhận hay bỏ qua gợi ý.
- `tose ci artifacts <run_id>` chỉ liệt kê metadata: tên, kích thước, SHA-256, trạng thái che bí mật và thời hạn lưu.
- `tose ci artifact <artifact_id>` hiển thị metadata của một artifact. Với `--content` nó in văn bản đã che bí mật sau khi kiểm tra các byte với SHA-256 đã ghi nhận; nếu không khớp thì không ghi gì và thoát với mã `8`. `--output <file>` tạo file mới với quyền 600 và không bao giờ ghi đè. Artifact chưa che bí mật (nhị phân) bị từ chối, vì máy chủ chỉ phục vụ nó cho admin đã đăng nhập.

## Chưa có

`tose ci init`, `tose ci validate` và agent profile. API chưa có route agent profile và chưa có trình kiểm tra pipeline offline được công bố.
