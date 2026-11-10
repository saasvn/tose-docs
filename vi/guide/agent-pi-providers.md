# Nhà cung cấp model cho Pi

**Pi** là một coding agent tuyển chọn trong **Template catalog** của TOSE. Pi dùng tài khoản của chính bạn tại nhà cung cấp model: bạn đưa API key của nhà cung cấp (hoặc dùng gói của họ) và nhà cung cấp tính phí trực tiếp cho bạn. Trang này liệt kê các nhà cung cấp Pi có thể dùng, mỗi bên cần gì, và sự khác nhau giữa những sản phẩm có tên gần giống nhau.

::: info Bản phát hành 1.1.0
Cả mười nhà cung cấp dưới đây đều có từ bản phát hành Pi **1.1.0**, bản mặc định cho các Pi agent mới. Bản 1.0.0 vẫn còn trong danh sách và chỉ có Anthropic, OpenAI và Google. Bản phát hành đã công bố là bất biến, nên **các cài đặt Pi hiện có không tự động được nâng cấp**; để dùng nhà cung cấp mới, hãy cài một app mới.
:::

## Nhà cung cấp

Bạn chọn nhà cung cấp khi lập kế hoạch cài đặt. Key là một secret được mã hóa, `PI_API_KEY`, và TOSE chỉ đưa nó cho Pi dưới dạng biến mà nhà cung cấp đó đọc. Ở chế độ mạng mặc định **Chỉ nhà cung cấp** (Provider only), agent chỉ truy cập được host ở cột thứ ba.

| Nhà cung cấp (`PI_PROVIDER`) | Biến key Pi đọc | Host được duyệt | Có từ bản | Ghi chú |
|---|---|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | `api.anthropic.com` | 1.0.0 | |
| `openai` | `OPENAI_API_KEY` | `api.openai.com` | 1.0.0 | |
| `google` | `GEMINI_API_KEY` | `generativelanguage.googleapis.com` | 1.0.0 | |
| `opencode-go` | `OPENCODE_API_KEY` | `opencode.ai` | 1.1.0 | **Gói đăng ký OpenCode Go** với key Go của bạn, không phải OpenCode Zen. |
| `deepseek` | `DEEPSEEK_API_KEY` | `api.deepseek.com` | 1.1.0 | |
| `moonshotai` | `MOONSHOT_API_KEY` | `api.moonshot.ai` | 1.1.0 | **Moonshot Open Platform** (toàn cầu), không phải Kimi Coding. |
| `openrouter` | `OPENROUTER_API_KEY` | `openrouter.ai` | 1.1.0 | Pi đọc danh sách model key của bạn được dùng từ OpenRouter; cùng host đó phục vụ suy luận. |
| `cloudflare-workers-ai` | `CLOUDFLARE_API_KEY` | `api.cloudflare.com` | 1.1.0 | Cần thêm account ID, xem [bên dưới](#account-id-của-cloudflare-workers-ai). Không phải Cloudflare AI Gateway. |
| `xai` | `XAI_API_KEY` | `api.x.ai` | 1.1.0 | |
| `zai` | `ZAI_API_KEY` | `api.z.ai` | 1.1.0 | **Z.AI Coding Plan** (toàn cầu). Gói Trung Quốc không được cung cấp. |

## Các nhà cung cấp có tên gần giống nhau

Hãy chọn đúng sản phẩm khớp với key và gói bạn có.

- **OpenCode Go hay OpenCode Zen.** `opencode-go` là **gói đăng ký OpenCode Go**. OpenCode Zen (trả theo mức dùng) là sản phẩm khác và dùng cùng biến key, nên với nhà cung cấp này TOSE giới hạn Pi chỉ dùng model Go.
- **Moonshot Open Platform hay Kimi Coding.** `moonshotai` là API **Moonshot Open Platform** tại `api.moonshot.ai`. Gói đăng ký Kimi Coding là sản phẩm khác và không được cung cấp.
- **Z.AI Coding Plan.** `zai` là **Z.AI Coding Plan** toàn cầu. Gói Trung Quốc không được cung cấp.
- **Cloudflare Workers AI hay AI Gateway.** `cloudflare-workers-ai` gọi trực tiếp Workers AI. Cloudflare AI Gateway là sản phẩm khác và không được cung cấp.

## Account ID của Cloudflare Workers AI

`cloudflare-workers-ai` là nhà cung cấp duy nhất cần thêm một đầu vào ngoài key: **account ID Cloudflare** của bạn, được đưa cho Pi dưới dạng `CLOUDFLARE_ACCOUNT_ID`.

- Đây **không phải secret**. Nó gồm 32 ký tự thập lục phân viết thường.
- Kế hoạch bắt buộc có nó với nhà cung cấp này và từ chối nó với mọi nhà cung cấp khác.
- Nó được lưu trong kế hoạch đã duyệt và trong cài đặt, giống lựa chọn nhà cung cấp. Đổi nó nghĩa là có kế hoạch mới và phải duyệt lại.

## Công cụ lập trình và mạng

Từ bản 1.1.0, image Pi có **Node.js với npm** và **uv cho Python**, và `/AGENTS.md` mô tả container cho Pi.

Chế độ mạng **Development (restricted)** (`development`) của Pi mở thêm các host của git, npm và PyPI bên cạnh nhà cung cấp, giống Codex và Claude Code, nên `git clone`, `npm install` và `uv pip install` hoạt động. Chế độ mặc định **Chỉ nhà cung cấp** vẫn chỉ truy cập host của nhà cung cấp. Bản 1.0.0 không có công cụ lập trình, nên chế độ này mở các host đó cho nó mà không kèm công cụ.

## Thanh toán và model

- **Phí sử dụng do nhà cung cấp tính**, vào key hoặc gói của chính bạn, **nằm ngoài ví TOSE**. TOSE chỉ tính compute và lưu trữ từ [ví trả trước](/vi/guide/pricing). Kế hoạch và biểu mẫu đều nêu điều này. Hãy đặt hạn mức chi tiêu tại nhà cung cấp.
- **TOSE không giữ danh sách model.** Nhà cung cấp quyết định key của bạn được dùng model nào và model nào hỗ trợ tool. Để trống **Model** để dùng mặc định của Pi cho nhà cung cấp đã chọn.
- Nhà cung cấp thường xuyên thêm và gỡ model, nên hãy kiểm tra model với nhà cung cấp trước khi dựa vào nó cho công việc lập trình.

Để cài một agent, mở **Template catalog** trên dashboard ([làm quen với dashboard](/vi/guide/getting-started#làm-quen-với-dashboard)).
