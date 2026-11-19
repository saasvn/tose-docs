---
title: "Steer một run agent đang chạy"
description: "Gửi thêm chỉ dẫn cho một run của Agent Runtime đang thực thi, không tạo run mới hay khởi động lại, và biết trung thực engine đã nhận được hay chưa."
---

# Steer một run agent đang chạy

Steer gửi thêm một chỉ dẫn cho một run của Agent Runtime **đang thực thi**: không có run mới, không có phiên mới, không khởi động lại và không hủy. Ví dụ: "Giữ cơ sở dữ liệu hiện tại, chỉ sửa API và chạy test." Gửi tin nhắn thì bắt đầu một run, hủy thì dừng run, còn steer thì điều chỉnh run đang diễn ra. Không có chế độ "chờ agent rảnh rồi mới gửi".

Tính năng này dành cho agent của Agent Runtime (`/api/workspaces/{slug}/agents`). Tác vụ của coding agent tuyển chọn ([Giao tác vụ cho coding agent](/vi/guide/agent-tasks)) không steer được.

::: warning Tình trạng khả dụng
- Instance phải chạy Agent Runtime (`AGENT_RUNTIME_ENABLED`) cùng cơ chế kiểm tra trả trước. Tính năng chưa phát hành rộng rãi.
- Chỉ engine có `capabilities.steer` là `true` mới nhận steer. Hiện Pi là engine duy nhất của Agent Runtime, và nó hỗ trợ steer. Steer cho các engine khác được theo dõi ở tose-app [#538](https://github.com/saasvn/tose-app/issues/538); đừng kỳ vọng mọi engine hoạt động giống nhau.
- Image agent Pi vẫn cần một đợt canary trên staging với key nhà cung cấp của chính người dùng trước khi được coi là sẵn sàng cho run của khách hàng.
:::

## Cách hoạt động {#how-it-works}

1. Bạn gửi chỉ dẫn. TOSE lưu nó ở trạng thái `queued` và trả `202`. `202` chỉ có nghĩa như vậy.
2. Worker đang chạy run lấy từng chỉ dẫn đang chờ, theo thứ tự, và chuyển cho engine.
3. Pi đọc chỉ dẫn ở điểm an toàn kế tiếp: sau khi lượt trả lời hiện tại chạy xong các lời gọi tool, trước lần gọi model tiếp theo. Tool đang chạy **không bị ngắt**. Mỗi lần gọi model đọc một chỉ dẫn.
4. Chỉ dẫn là dữ liệu cho agent. Nó không cấp thêm quyền nào, và các bước kiểm tra tool và quyền của chính engine vẫn giữ nguyên.

Steer chỉ được nhận khi tiến trình engine phục vụ run này đã xác nhận lúc khởi động rằng nó hỗ trợ steer. Trước đó, steer trả `409 STEER_NOT_READY`: hãy thử lại sau giây lát.

## Trạng thái {#statuses}

| Trạng thái | Ý nghĩa |
|--------|---------|
| `queued` | Đã lưu, chưa chuyển cho engine. |
| `dispatching` | Đã chuyển, đang chờ engine xác nhận. |
| `delivered` | Engine xác nhận đã xếp hàng chỉ dẫn. Điều này **không bao giờ** có nghĩa là model đã làm theo. |
| `rejected` | Engine không đưa nó vào hàng đợi: nó chưa bao giờ tới engine, hoặc engine đã từ chối. |
| `uncertain` | Có thể đã tới engine nhưng không xác nhận được, hoặc đã được xác nhận nhưng run kết thúc trước khi model đọc. Nó không bao giờ được gửi lại. |

Chỉ dẫn `rejected` hoặc `uncertain` mang một mã:

| Mã | Trạng thái | Khi nào |
|------|--------|------|
| `RUN_ENDED` | `rejected` | Run kết thúc trước khi chỉ dẫn được gửi. |
| `RUN_CANCELING` | `rejected` | Lệnh hủy, ngủ cưỡng bức hoặc xóa agent có hiệu lực trước. |
| `REVISION_CHANGED` | `rejected` | Agent được cập nhật sau khi run bắt đầu. |
| `ACCESS_REVOKED` | `rejected` | Người hoặc thông tin xác thực đã gửi nó mất quyền trước khi nó được gửi (xem [Quyền được kiểm tra lại](#access-is-checked-again)). |
| `ENGINE_REJECTED` | `rejected` | Engine từ chối, hoặc không thể chuyển giao chỉ dẫn. |
| `RUN_NOT_ACTIVE` | `rejected` | Vòng lặp của engine đã dừng khi chỉ dẫn tới. |
| `NOT_SUPPORTED` | `rejected` | Tiến trình engine đang phục vụ run không hỗ trợ steer. |
| `NO_ACK` | `uncertain` | Không có xác nhận trước khi run kết thúc. |
| `UNREAD` | `uncertain` | Engine đã xác nhận, nhưng run kết thúc trước khi model đọc. |
| `RUN_OUTCOME_UNKNOWN` | `uncertain` | Run kết thúc bất ngờ, nên không rõ model đã đọc hay chưa. |

## Quyền được kiểm tra lại trước khi gửi {#access-is-checked-again}

Mỗi chỉ dẫn ghi lại ai đã gửi. Ngay trước khi worker chuyển nó cho engine, TOSE kiểm tra lại rằng:

- phiên đăng nhập, API key hoặc ứng dụng kết nối đã gửi nó vẫn còn hiệu lực (chưa đăng xuất, hết hạn hay bị thu hồi);
- người đó vẫn là thành viên của workspace;
- vai trò và scope hiện tại của họ vẫn cho phép `agents:control`.

Nếu một bước kiểm tra không đạt, chỉ dẫn bị `rejected` với `ACCESS_REVOKED` ngay tại vị trí của nó trong hàng đợi, và các chỉ dẫn sau vẫn được xử lý theo thứ tự. Hãy khôi phục quyền truy cập rồi gửi chỉ dẫn mới. Mã định danh phiên là dữ liệu riêng của máy chủ.

## Điều gì được ưu tiên hơn steer {#priority}

Hủy, ngủ cưỡng bức, xóa agent, quyền bị thu hồi và ngân sách cạn luôn thắng: khi chúng có hiệu lực, các chỉ dẫn đang chờ bị từ chối. Steer không bao giờ đánh thức agent đang ngủ (`409 AGENT_SLEEPING` khi agent đang chuyển sang ngủ). Chỉ dẫn được chuyển ngay trước lệnh hủy vẫn có thể được engine xác nhận trong khoảng một giây; lệnh hủy vẫn kết thúc run, và chỉ dẫn mà model chưa đọc được báo `uncertain` (`UNREAD`).

Chỉ dẫn mới cần vượt qua bước kiểm tra trả trước của agent. Trước khi chuyển các chỉ dẫn đang chờ cho engine, worker kiểm tra lại số dư và ngân sách của run; số dư vẫn có thể thay đổi sau bước kiểm tra đó. Chỉ dẫn không qua được bước này vẫn ở `queued` cho đến khi lần ngủ kéo theo hoặc việc run kết thúc từ chối nó (`RUN_CANCELING` hoặc `RUN_ENDED`).

## REST API {#rest-api}

Các route nằm dưới `/api/workspaces/{slug}/agents/{agent_id}/runs/{run_id}`. Hợp đồng là [đặc tả OpenAPI](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) (operation `steerAgentRun` và `listAgentRunSteers`).

| Route | Scope | Mục đích |
|-------|-------|---------|
| `POST /steer` | `agents:control` | Gửi chỉ dẫn: body `{"message": "..."}` (1 đến 8192 byte văn bản) và header `Idempotency-Key` bắt buộc. Trả `202` kèm yêu cầu (`id`, `seq`, `status`, ...). |
| `GET /steers` | `agents:read` | Liệt kê các chỉ dẫn của run theo thứ tự, kèm trạng thái và mã. |

Mọi thành viên workspace đều có thể steer; API key hoặc ứng dụng kết nối cần thêm scope. API không bao giờ trả lại nội dung chỉ dẫn và không ghi nó vào sự kiện, log hay nhật ký kiểm toán.

Thử lại với cùng `Idempotency-Key` trả về cùng yêu cầu; dùng lại key đó với nội dung khác trả `409`.

| Phản hồi | Khi nào |
|--------|------|
| `400` | Chỉ dẫn rỗng, dài hơn 8192 byte hoặc không phải văn bản hợp lệ, hoặc `Idempotency-Key` bị thiếu hay không dài 8 đến 128 ký tự. |
| `404` | Agent hoặc run không thuộc workspace này. |
| `409 NOT_SUPPORTED` | Engine, hoặc tiến trình engine phục vụ run này, không hỗ trợ steer. |
| `409 STEER_NOT_READY` | Engine phục vụ run này chưa xác nhận hỗ trợ steer. Hãy thử lại sau giây lát. |
| `409 RUN_NOT_ACTIVE` | Run chưa bắt đầu, đã kết thúc, hoặc agent đang bị xóa. |
| `409 RUN_CANCELING` | Đang có lệnh hủy. |
| `409 AGENT_SLEEPING` | Agent đang chuyển sang ngủ. |
| `409 REVISION_CHANGED` | Agent được cập nhật sau khi run bắt đầu. |
| `429 STEER_QUEUE_FULL` | Đã có 8 chỉ dẫn đang chờ cho run này, hoặc run đã đạt tổng cộng 50. |
| `402 budget_exhausted` | Ví hoặc ngân sách của agent đã cạn. Các lần từ chối khác ở bước kiểm tra trả trước, ví dụ khi không kiểm tra được thanh toán, trả `503`. |

```bash
BASE=https://api-v2.tose.sh/api/workspaces/my-team/agents/AGENT_ID/runs/RUN_ID

curl -sS -X POST "$BASE/steer" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Idempotency-Key: steer-0001" \
  -H "Content-Type: application/json" \
  -d '{"message":"Keep the current database, only change the API and run the tests."}'

curl -sS "$BASE/steers" -H "X-API-Key: $TOSE_API_KEY"
```

Sự kiện của run có `steer_queued`, `steer_delivered`, `steer_rejected` và `steer_uncertain` kèm `steer_id`, `seq`, trạng thái và mã, không bao giờ kèm nội dung chỉ dẫn.

## Tool MCP {#mcp-tool}

Instance chạy Agent Runtime cung cấp `steer_agent_run` (scope `agents:control`) với `agent_id`, `run_id`, `message` và `request_id` tùy chọn (8 đến 64 ký tự; dùng lại để thử lại an toàn). Tool áp dụng cùng quy tắc. Các mã từ chối steer (như `RUN_NOT_ACTIVE`, `STEER_NOT_READY`, `STEER_QUEUE_FULL` và `NOT_SUPPORTED`) giống REST, còn lỗi ngân sách, billing, xung đột, dữ liệu không hợp lệ và không tìm thấy dùng mã MCP `BUDGET_EXHAUSTED`, `BILLING_UNAVAILABLE`, `CONFLICT`, `INVALID_ARGUMENT` và `NOT_FOUND`. Nếu không có `request_id`, một giá trị mới được tạo, nên thử lại mà không có nó là một chỉ dẫn mới. Tool trả `status`, `steer_id`, `seq`. Theo dõi kết quả trong sự kiện của run bằng `get_agent_run`.

## Dashboard {#dashboard}

Trang run (`/w/<workspace>/agents/<agent_id>/runs/<run_id>`) có biểu mẫu **Steer đang chạy** khi engine hỗ trợ steer và run đang chạy, kèm lưu ý rằng chỉ dẫn được đưa vào sau lượt tool hiện tại và không hủy tool đang chạy. Bên dưới, mỗi chỉ dẫn được liệt kê kèm trạng thái và mã. Trang có tiếng Anh và tiếng Việt.

## Liên quan

- [Agent Runtime trên dashboard](/vi/guide/agent-runtime-dashboard), cho trang agent và các lần chạy
- [`tose agents steer`](/vi/commands/agents), để steer từ dòng lệnh
- [Giá và hạn mức của Agent Runtime](/vi/guide/agent-runtime-pricing)
- [Biến môi trường của agent Agent Runtime](/vi/guide/agent-environment-and-auto-sleep#agent-runtime-environment)
- [API key và scope](/vi/api/api-keys)
