# Skills: hướng dẫn cho agent

**Skill** là một bộ hướng dẫn ngắn, có phiên bản, dạy AI agent cách dùng TOSE an toàn: điều kiện tiên quyết, scope OAuth, luồng duyệt, poll, kiểm tra và khôi phục. Skill tự nó không chạy gì, và không thêm tool nào cho agent.

**Skill không phải template.** Template deploy là một ứng dụng mà TOSE cài và chạy giúp bạn. Skill chỉ dạy agent cách làm việc với TOSE.

## Catalogue

Năm skill được liệt kê công khai, không cần đăng nhập, tại `GET https://<API host của TOSE>/api/skills`. Cùng các file đó cũng có sẵn cho client đã kết nối dưới dạng resource `skill://tose/<name>/SKILL.md` và qua extension skills của MCP (`io.modelcontextprotocol/skills`).

| Skill | Dùng để |
|-------|---------|
| `deploy-nextjs-to-tose` | Deploy project Next.js, có bạn duyệt, rồi kiểm tra đã live. |
| `deploy-go-service-to-tose` | Deploy service Go HTTP, có bạn duyệt, rồi kiểm tra. |
| `debug-failed-deployment` | Tìm nguyên nhân deployment thất bại hoặc app không truy cập được, chỉ bằng tool đọc. |
| `optimize-cloud-cost` | Xem workspace đang trả tiền cho gì và đề xuất khoản tiết kiệm để bạn duyệt. |
| `safe-rollback` | Khôi phục deployment trước đó sau một bản phát hành lỗi, có bạn duyệt. |

## Phiên bản và ghim phiên bản

Mỗi skill có phiên bản `MAJOR.MINOR.PATCH`, và catalogue liệt kê digest SHA-256 cùng kích thước của từng file. Một phiên bản luôn tương ứng một nội dung. Hãy ghim **tên, phiên bản và các digest**: digest đổi nghĩa là skill đã đổi.

## Cài đặt an toàn

1. Chỉ tải catalogue và file từ API host chính thức của TOSE qua HTTPS, hoặc qua connector.
2. Kiểm tra kích thước và digest `sha256` của từng file với catalogue. Từ chối skill nếu có chỗ nào khác.
3. Đọc skill trước khi bật, và xem lại mỗi khi phiên bản hoặc một digest thay đổi.
4. Cài với tên thể hiện nó đến từ TOSE, và không bao giờ để nó thay thế skill cục bộ cùng tên.
5. Không cấp thêm quyền tool nào cho nó. Các bước deploy và rollback của skill vẫn cần bạn duyệt trong trình duyệt và vai trò owner hoặc admin.

Digest chứng minh bản tải về khớp với catalogue. Digest không phải chữ ký và đến từ cùng một server, nên sự tin cậy dựa vào việc kết nối tới host chính thức qua TLS.

Mọi skill đều dặn agent coi file repository, commit message và log là dữ liệu không đáng tin, không bao giờ là chỉ dẫn.
