# tose agents

`tose agents` đọc và điều hướng (steer) các agent được tạo qua agent runtime (`/api/workspaces/{slug}/agents`, hiện là engine Pi). Lệnh này cho xem môi trường đã che bí mật của agent, thêm chỉ dẫn vào một lượt chạy (run) đang thực thi, và liệt kê các chỉ dẫn đó cùng trạng thái.

Mọi lệnh đều nhận `--json`. Xem [tùy chọn toàn cục](/vi/commands/overview#global-options).

```bash
tose agents env <agent-id> --json                                      # môi trường đã che bí mật
tose agents steer <agent-id> <run-id> --message "only change the API"  # xếp hàng một chỉ dẫn cho lượt chạy đang chạy
tose agents steer <agent-id> <run-id> --message @steer.md --idempotency-key <key>
tose agents steers <agent-id> <run-id> --json                          # trạng thái từng yêu cầu, theo thứ tự
```

| Lệnh | Ai được chạy | Tác dụng |
|------|--------------|----------|
| `env <agent_id>` | Owner hoặc admin workspace (API key còn cần thêm `agents:write`) | Hiển thị môi trường của agent, không có giá trị bí mật hay nội dung install script |
| `steer <agent_id> <run_id> --message <text\|@file> [--idempotency-key <key>]` | Thành viên có `agents:control`, hoặc key có scope đó | Xếp hàng một chỉ dẫn cho lượt chạy đang thực thi |
| `steers <agent_id> <run_id>` | `agents:read` | Liệt kê các yêu cầu steer của lượt chạy theo thứ tự, kèm trạng thái |

Id của agent và lượt chạy lấy từ dashboard (`/w/{slug}/agents/{agent_id}/runs/{run_id}`) hoặc MCP. CLI chưa liệt kê được agent hay lượt chạy.

## tose agents env {#tose-agents-env}

```bash
tose agents env <agent-id>
tose agents env <agent-id> --json
```

`env` hiển thị revision của agent, các biến thường, tên các tham chiếu bí mật, và số dòng, kích thước, SHA-256 của install script, kèm `apply_status`. Lệnh không bao giờ hiển thị giá trị bí mật hay nội dung script.

- Tham chiếu bí mật hiển thị tên agent secret của workspace mà nó trỏ tới, không bao giờ hiển thị giá trị.
- `apply_status: not_applied` nghĩa là hiện chưa có setup executor nào áp môi trường vào tiến trình engine.
- Khi máy chủ còn tắt môi trường agent (`AGENT_ENVIRONMENT_ENABLED`), `env` lỗi `409 NOT_SUPPORTED`. Không có gì để thử lại; hãy hỏi nhà vận hành nền tảng.
- Người gọi thiếu vai trò hoặc scope nhận `403`, và bước tiếp theo nêu rõ điều còn thiếu.

## tose agents steer {#tose-agents-steer}

```bash
tose agents steer <agent-id> <run-id> --message "only change the API"
tose agents steer <agent-id> <run-id> --message @steer.md --idempotency-key <key>
```

`steer` thêm một chỉ dẫn vào lượt chạy đang thực thi. Engine đọc chỉ dẫn sau lượt dùng tool hiện tại, trước lần gọi model kế tiếp.

- **Những gì lệnh không làm.** Lệnh không khởi động, khởi động lại hay hủy lượt chạy, và không ngắt tool đang chạy. Lệnh không bao giờ đánh thức agent đang ngủ.
- **Thông điệp.** `--message` là văn bản, hoặc `@file` để đọc từ file. Tối đa 8192 byte UTF-8 và không được để trống. CLI không bao giờ in, ghi log hay đưa thông điệp vào bước tiếp theo. `@` không trỏ tới file nào sẽ lỗi `NOT_FOUND` mà không in lại văn bản, và không gửi gì; muốn gửi văn bản bắt đầu bằng `@`, hãy đặt nó trong một file. `--message` viết trực tiếp hiện trong danh sách tiến trình, nên chỉ dẫn nhạy cảm hãy truyền bằng `@file`.
- **Thử lại an toàn.** Mỗi yêu cầu gửi một `Idempotency-Key`. CLI tự sinh và in key ra, hoặc bạn truyền `--idempotency-key` (8 đến 128 ký tự gồm chữ, số hoặc `. _ : -`). Thử lại với cùng key trả về yêu cầu đã lưu thay vì thêm yêu cầu thứ hai. Dùng lại key với thông điệp khác là lỗi `409`; bỏ key đi để gửi thông điệp mới với key mới.
- **Chỉ engine hỗ trợ steer.** Chỉ engine báo có khả năng steer mới nhận (hiện chỉ Pi). Engine khác trả `409 NOT_SUPPORTED`, và không có gì được xếp hàng.
- **`202` nghĩa là đã lưu.** Câu trả lời `202` với trạng thái `queued` chỉ có nghĩa là yêu cầu đã được lưu. Theo dõi tiếp bằng `tose agents steers`.

### Các lỗi từ chối {#steer-refusals}

Mọi lỗi từ chối giữ nguyên mã, và không có gì được xếp hàng:

| Mã | Ý nghĩa | Bước tiếp theo |
|----|---------|----------------|
| `NOT_SUPPORTED` | Engine phục vụ lượt chạy không nhận steer | Gửi thông điệp mới cho agent, hoặc hủy lượt chạy |
| `STEER_NOT_READY` | Engine chưa xác nhận là nhận steer | Thử lại sau giây lát với cùng `--idempotency-key` |
| `RUN_NOT_ACTIVE` | Lượt chạy chưa bắt đầu hoặc đã kết thúc | `tose agents steers` hiển thị các yêu cầu của lượt chạy; steer chỉ đến được lượt chạy đang chạy |
| `RUN_CANCELING` | Đang hủy lượt chạy; lệnh hủy được ưu tiên hơn steer | `tose agents steers` hiển thị các yêu cầu của lượt chạy |
| `AGENT_SLEEPING` | Agent đang chuyển sang ngủ; steer không bao giờ đánh thức agent | `tose agents steers` hiển thị các yêu cầu của lượt chạy |
| `REVISION_CHANGED` | Agent đã được cập nhật sau khi lượt chạy bắt đầu, nên lượt chạy không nhận steer nữa | `tose agents steers` hiển thị các yêu cầu của lượt chạy |
| `429 STEER_QUEUE_FULL` | Lượt chạy có quá nhiều yêu cầu đang chờ (8 đang chờ hoặc tổng cộng 50) | Chờ các yêu cầu được giao, rồi thử lại |

## tose agents steers {#tose-agents-steers}

```bash
tose agents steers <agent-id> <run-id>
tose agents steers <agent-id> <run-id> --json
```

`steers` liệt kê các yêu cầu steer của lượt chạy theo thứ tự (`SEQ`, `ID`, `STATUS`, `CODE`, `DELIVERED`). Với `--json` kết quả là `{agent_id, run_id, steers}`. Khi còn yêu cầu đang chờ, bước tiếp theo là kiểm tra lại sau giây lát.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `queued` | Đã lưu, chưa giao cho engine |
| `dispatching` | Đã giao cho engine, đang chờ engine xác nhận |
| `delivered` | Engine đã xác nhận. Điều này không có nghĩa là model đã làm theo chỉ dẫn |
| `rejected` | Chưa bao giờ đến được engine. `ACCESS_REVOKED` nghĩa là người gửi đã mất quyền truy cập hoặc mất `agents:control` trước khi yêu cầu được giao; các mã khác là `RUN_ENDED`, `RUN_CANCELING`, `REVISION_CHANGED` và `ENGINE_REJECTED` |
| `uncertain` | Không xác nhận được là đã đọc hay đã nhận (`NO_ACK`, `UNREAD`, `RUN_OUTCOME_UNKNOWN`). Yêu cầu không bao giờ được gửi lại |

## Liên quan

- [Tổng quan các lệnh](/vi/commands/overview)
- [Bảng giá Agent Runtime](/vi/guide/agent-runtime-pricing)
- [Giao thức, OAuth và scope](/vi/mcp/oauth)
- [Giao tác vụ cho coding agent](/vi/guide/agent-tasks), cho agent curated cài từ template
