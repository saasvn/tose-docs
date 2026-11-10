# Chế độ mạng cho coding agent

TOSE phát hành sẵn các coding agent được tuyển chọn: **Pi**, **Codex** và **Claude Code**. Mỗi agent chạy trong container riêng với chính sách mạng riêng. Bạn chọn agent được phép truy cập Internet đến mức nào khi lập kế hoạch cài đặt, và kế hoạch bạn duyệt chính là kế hoạch được áp dụng.

Trang này giải thích ba chế độ, mỗi chế độ truy cập được và không truy cập được gì, chế độ Phát triển cung cấp những bộ công cụ nào cho từng agent, và rủi ro còn lại. Để cài một agent, mở **Template catalog** trong dashboard ([tổng quan dashboard](/vi/guide/getting-started#lam-quen-voi-dashboard)).

::: warning Tình trạng và kiểm chứng
Phát triển (giới hạn) đã được triển khai và có kiểm thử cho chính sách và kế hoạch. Chế độ này chưa được chứng minh trên cluster thật có thực thi, và TOSE chưa hoàn tất việc chấp nhận [rủi ro còn lại](#rui-ro-con-lai) cho bản phát hành rộng rãi. Bạn chọn được chế độ nào tùy theo những gì máy chủ báo cho workspace của bạn.
:::

## Ba chế độ

| Chế độ | Giá trị API | Agent truy cập được | Agent không truy cập được |
|--------|-------------|---------------------|---------------------------|
| **Chỉ nhà cung cấp mô hình** (mặc định) | `approved` | Máy chủ API và đăng nhập của nhà cung cấp mô hình, cổng 443 | GitHub, npm, PyPI và mọi trang khác. `git clone` và cài gói sẽ thất bại |
| **Phát triển (giới hạn)** | `development` | Nhà cung cấp, cùng các máy chủ chính xác của những bộ công cụ có trong image ([bên dưới](#bo-cong-cu-theo-agent)), cổng 443 | Mạng nội bộ, metadata đám mây và loopback. Xem [Rủi ro còn lại](#rui-ro-con-lai) để biết những gì vẫn có thể phản hồi |
| **Internet công khai không giới hạn** | `internet` | Mọi máy chủ công khai | Địa chỉ nội bộ, link-local, metadata đám mây và địa chỉ của cluster |

- **Mặc định là Chỉ nhà cung cấp mô hình.** Chỉ chọn chế độ khác khi agent phải tải mã nguồn hoặc gói.
- Với Claude Code, máy chủ của nhà cung cấp là `api.anthropic.com`, `platform.claude.com` và `claude.ai`, để việc đăng nhập của chính nó hoạt động. Với Codex đăng nhập bằng gói ChatGPT, đó là `auth.openai.com` và `chatgpt.com`.
- **Internet công khai không giới hạn có rủi ro cao nhất.** Mã và dữ liệu có thể bị gửi tới bất kỳ máy chủ công khai nào trong khi agent đang giữ khóa API hoặc phiên đăng nhập của bạn. Với công việc lập trình, nên ưu tiên Phát triển (giới hạn).
- Địa chỉ nội bộ, link-local và metadata đám mây bị chặn ở mọi chế độ.
- **Không có gì tự mở rộng một cài đặt đã có.** Cài đặt giữ nguyên các đích của kế hoạch bạn đã duyệt cho đến khi có người duyệt kế hoạch mới.

## Bộ công cụ theo agent {#bo-cong-cu-theo-agent}

Chế độ Phát triển cung cấp các bộ công cụ của image agent, nên không quảng cáo một công cụ mà image không có. Go module không được cung cấp, vì không image tuyển chọn nào có Go toolchain.

| Bộ công cụ | Máy chủ (tên chính xác, cổng 443) | Pi | Codex | Claude Code |
|------------|-----------------------------------|:--:|:-----:|:-----------:|
| `git` | `github.com`, `codeload.github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` | Có | Có | Có |
| `npm` | `registry.npmjs.org` | Có | Có | Có |
| `python` (uv và pip) | `pypi.org`, `files.pythonhosted.org` | Có | Có | Có |

Pi có Node.js kèm npm và uv cho Python từ bản 1.1.0, bản phát hành mặc định của Pi. Pi 1.0.0 là bất biến và không có các công cụ này: chế độ Phát triển vẫn mở cùng các máy chủ npm và PyPI cho nó nhưng thiếu công cụ, nên hãy cài một ứng dụng Pi mới ở bản 1.1.0 để dùng chúng.

Danh sách máy chủ là chính sách đã được duyệt và có phiên bản do TOSE sở hữu (hiện là `2026-11-09.1`). Một yêu cầu không thể thêm máy chủ, ký tự đại diện hay địa chỉ IP. Khi TOSE đổi chính sách, kế hoạch tiếp theo có hash mới. Một cài đặt đã duyệt không bao giờ bị đổi âm thầm.

## Bạn thấy gì trong kế hoạch

Khi lập kế hoạch, chế độ được nêu bằng lời dễ hiểu trước khi bạn duyệt:

- `network.mode` là `development`, kèm phiên bản chính sách, các nhóm công cụ và mọi máy chủ đích.
- Cảnh báo `DEVELOPMENT_EGRESS` nêu các giới hạn ở mục [Rủi ro còn lại](#rui-ro-con-lai).
- `network.egress` là `approved`. Kế hoạch phát triển được áp dụng như `approved` với các máy chủ của chính sách nằm trong danh sách đích, nên các giá trị egress đã công bố không đổi.
- `GET /curated-templates` báo chế độ trong đối tượng `development`. Client thêm `development` vào các chế độ nó cung cấp khi đối tượng này xuất hiện. Danh sách `inputs.network_mode.allowed` và `network.egress_modes` vẫn chỉ hiện `approved` và `internet`.

Chế độ và các đích nằm trong hash của kế hoạch. Đổi một trong hai nghĩa là có kế hoạch mới và cần duyệt lại.

## Cách áp dụng

Trước khi đĩa và pod được tạo, mỗi cài đặt nhận một chính sách mạng chặn mặc định. Cluster phân giải các tên đã duyệt và cho phép TCP 443 tới các địa chỉ nó trả về. Dải nội bộ và metadata luôn bị chặn, ưu tiên hơn mọi quy tắc cho phép. Chuyển hướng tới máy chủ không có trong danh sách, tên phân giải về dải nội bộ hoặc metadata, và địa chỉ IP trực tiếp đều vẫn bị chặn.

Nếu cluster không thể thực thi chính sách, kế hoạch bị chặn với `NETWORK_POLICY_NOT_ENFORCED`, nên việc triển khai từ chối an toàn: không tạo gì và không tính phí.

## Rủi ro còn lại {#rui-ro-con-lai}

Phát triển (giới hạn) thu hẹp phạm vi truy cập của agent, nhưng không làm cho việc giao thông tin xác thực nhạy cảm cho agent trở nên an toàn. Hãy đọc các giới hạn sau trước khi duyệt kế hoạch phát triển:

- **Cho phép theo tên, không theo trang.** Cluster cho phép các địa chỉ mà một tên phân giải ra và không kiểm tra tên máy chủ TLS. Các trang khác dùng chung địa chỉ CDN (ví dụ Cloudflare hoặc Fastly) vẫn có thể phản hồi. Chế độ Chỉ nhà cung cấp mô hình cũng có mức phơi nhiễm tương tự qua các máy chủ của nhà cung cấp.
- **Một số máy chủ trong danh sách nhận upload.** `github.com` và `registry.npmjs.org` nhận upload. Agent không tự giữ thông tin xác thực GitHub hay npm, nhưng một token bạn dán vào phiên, hoặc token bị prompt injection cài vào, cho phép nó `git push` hoặc `npm publish` dữ liệu ra ngoài.
- **Repository riêng tư dùng tính năng tải kho mã, không dùng chế độ này.** Tính năng tải kho GitHub đã được phát hành: kế hoạch có thể ghim một kho mã của workspace, riêng tư hoặc công khai, và TOSE clone nó vào `/workspace` mà không đưa token GitHub cho agent. Xem [Kho mã GitHub cho coding agent](/vi/guide/agent-repository-checkout).
- Agent có nhận khóa hoặc phiên đăng nhập của nhà cung cấp mô hình của bạn, nên hãy coi mọi thứ agent đọc được là thứ nó có thể gửi tới một máy chủ được cho phép.

## Liên quan

- [Tổng quan dashboard](/vi/guide/getting-started#lam-quen-voi-dashboard)
- [Biến môi trường](/vi/guide/environment)
