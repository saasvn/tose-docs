# Coding agent: biến môi trường và tự động ngủ

Trang này giải thích các biến môi trường bạn có thể thêm cho một coding agent tuyển chọn (**Codex**, **Pi** hoặc **Claude Code**), và tính năng tự động ngủ cho agent nhàn rỗi.

## Trên trang triển khai {#on-the-deploy-page}

Dashboard triển khai các agent này trên một trang duy nhất. Các thẻ, kế hoạch hiển thị trực tiếp và nút **Triển khai** được mô tả ở [Triển khai một coding agent](/vi/guide/deploy-coding-agent#deploy-an-agent). Hai thiết lập của trang đó được giải thích ở đây:

- **Biến môi trường**, trong thẻ **Nâng cao: phiên bản, model và biến môi trường**: xem [Biến môi trường riêng của bạn](#your-own-environment-variables).
- **Tự động ngủ khi không hoạt động**, trong thẻ **Cấu hình**: xem [Tự động ngủ cho agent nhàn rỗi](#auto-sleep-for-idle-agents).

## Biến môi trường riêng của bạn {#your-own-environment-variables}

Trong **Nâng cao**, bạn có thể thêm các thiết lập riêng cho agent. Qua API, chúng là trường `environment` của yêu cầu tạo kế hoạch:

```json
{
  "curated_template": "pi",
  "name": "My agent",
  "environment": {
    "variables": { "LOG_LEVEL": "debug" },
    "secret_refs": ["GITHUB_PAT"]
  }
}
```

Có hai loại:

- **Biến**: tên và giá trị không bí mật, tối đa **32**. Kế hoạch hiển thị chúng, nên duyệt kế hoạch là duyệt đúng các giá trị đó.
- **Tham chiếu secret**: chỉ có tên, tối đa **16**. Kế hoạch liệt kê các tên. Giá trị được gửi kèm yêu cầu cài đặt trong `secrets`, giống key của nhà cung cấp. Nó được mã hóa khi lưu, đưa cho tiến trình của agent dưới dạng biến môi trường, và không bao giờ được trả về trong bất kỳ lần đọc, kế hoạch, log hay lỗi nào. Một tham chiếu secret chỉ có thể trỏ tới giá trị bạn nhập cho chính cài đặt này.

Trong biểu mẫu, tích **Bí mật** ở một dòng để biến nó thành tham chiếu secret. Ô giá trị trở thành ô mật khẩu ngay trong dòng đó: kế hoạch chỉ giữ tên, còn giá trị đi kèm yêu cầu **Triển khai**.

Giới hạn và danh sách tên dành riêng nằm trong `inputs.environment` của `GET /curated-templates`, hãy đọc ở đó thay vì ghi cứng.

### Quy tắc

- Tên gồm chữ cái, chữ số và `_`, tối đa 63 ký tự, không bắt đầu bằng chữ số. Tên là duy nhất, không phân biệt hoa thường.
- **Tên dành riêng** bị từ chối với `ENV_NAME_RESERVED`. Gồm các tiền tố `TOSE_`, `KUBERNETES_`, `LD_`, `DYLD_`, `NPM_CONFIG_`, `GIT_CONFIG`, `SSH_`, `AGENT_`, `PI_`, `CODEX_`, `CLAUDE_`, `ANTHROPIC_`, `OPENAI_` và `GEMINI_`; các tên của shell, runtime, proxy và TLS như `PATH`, `HOME`, `NODE_OPTIONS`, `HTTPS_PROXY`, `SSL_CERT_FILE`; và các tên của nền tảng như `DATABASE_URL`. Thiết lập nhà cung cấp, model và key đi qua các đầu vào riêng của mẫu, không bao giờ qua biến môi trường.
- Tên trông giống thông tin xác thực (chứa `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE_KEY`, `API_KEY` hoặc `CREDENTIAL`, hoặc kết thúc bằng `_KEY`) phải là tham chiếu secret (`ENV_NAME_NEEDS_SECRET`).
- Một giá trị là một dòng tối đa 2048 ký tự, và tổng các giá trị thường tối đa 16 KiB.

### Thay đổi về sau

Danh sách **Environment Variables** của ứng dụng đã cài dùng cùng quy tắc, trừ việc tên trông giống thông tin xác thực không bị từ chối ở đó: nó được lưu như secret bất kể yêu cầu ghi gì. Agent đọc môi trường khi được triển khai. Thay đổi không bao giờ khởi động lại agent đang chạy: nó giữ các giá trị lúc khởi động cho tới khi bạn triển khai lại. Cài đặt báo điều này qua `environment.status`: `applied`, `restart_required` (có thay đổi mới hơn lần chạy gần nhất) hoặc `pending` (lần chạy chưa đọc nó). Một biến bị xóa qua API không được phát hiện là thay đổi, nên đừng dựa vào `restart_required` sau khi xóa.

::: info Chưa có
Script thiết lập tùy chọn chạy một lần cho agent chưa được cung cấp. Yêu cầu có script, lệnh khởi động hoặc hook sẽ bị từ chối như một trường không xác định.
:::

## Tự động ngủ cho agent nhàn rỗi {#auto-sleep-for-idle-agents}

Đóng trình duyệt không dừng agent: phiên của nó vẫn chạy và phí tính toán vẫn tiếp tục. Tự động ngủ dừng tài nguyên tính toán sau khi agent nhàn rỗi trong khoảng thời gian bạn chọn.

Thiết lập là `auto_sleep_minutes`: **Tắt** (`0`, mặc định), **15**, **30**, **60** hoặc **120** phút. Các cài đặt hiện có không bao giờ ngủ trừ khi bạn bật. Bạn chọn:

- ở thẻ **Cấu hình** của trang triển khai;
- sau này, trên trang của ứng dụng đã cài;
- bằng `PUT /api/workspaces/{slug}/template-installations/{id}/auto-sleep`, body `{"minutes": 30, "expected_revision": 0}`. Dùng `auto_sleep.revision` hiện tại; revision cũ trả về `409 REVISION_CONFLICT`.

### Khi nào agent ngủ

Agent chỉ ngủ sau khi TOSE quan sát thấy nó nhàn rỗi suốt cả khoảng thời gian: không có thao tác bàn phím hay đầu ra terminal, không có lệnh đang chạy, không cài đặt hay khởi tạo. Đóng tab không bao giờ được tính. Nếu TOSE không thể xác định an toàn, agent vẫn thức và trang nêu lý do.

::: warning Bản phát hành nào ngủ được
Tự động ngủ cần image có bộ dò hoạt động (`tose-agent-console activity`). **Codex 1.0.0**, **Claude Code 1.0.0** và **Pi 1.0.0** không có bộ dò này, nên agent của chúng vẫn thức và trang hiển thị lý do. **Pi 1.1.0**, bản phát hành mặc định của Pi, được build từ một commit của tose-app đã có bộ dò, nên agent Pi chạy bản 1.1.0 sẽ ngủ khi bật tự động ngủ. Bản phát hành đã xuất bản là bất biến: agent 1.0.0 không được nâng cấp tại chỗ, nên hãy cài một ứng dụng mới để dùng bản phát hành ngủ được.
:::

### Khi đang ngủ

- Phí tính toán dừng. Ổ đĩa vẫn tính phí.
- Tệp (`/workspace`, `/home/agent`) và trạng thái đăng nhập nhà cung cấp được giữ.
- Phiên tmux đang chạy **không** được giữ. Việc tiếp tục cuộc hội thoại phụ thuộc vào tính năng lưu điểm và tiếp tục của chính agent, không phụ thuộc TOSE.

### Đánh thức

Chỉ nút **Đánh thức và mở console** (`POST /api/workspaces/{slug}/template-installations/{id}/wake`) mới đánh thức agent. Đọc ứng dụng, polling và health check không bao giờ làm vậy. Cần ví còn tiền (nếu không sẽ có `402 INSUFFICIENT_BALANCE` và agent vẫn ngủ) và mất thời gian khởi động lại từ đầu. `auto_sleep.last_wake.outcome` là `pending` cho tới khi agent phản hồi, sau đó là `ok`, `failed` hoặc `insufficient_balance`.

Thiết lập và đánh thức dành cho chủ sở hữu hoặc quản trị viên workspace, hoặc API key có `deployments:execute`.

Xem thêm [Bảng giá](/vi/guide/pricing) và [hợp đồng OpenAPI](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
