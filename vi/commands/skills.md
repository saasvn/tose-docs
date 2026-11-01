# tose skills

Liệt kê và cài đặt skill cho agent từ danh mục công khai của TOSE.

Skill là một bộ hướng dẫn ngắn, có phiên bản, dạy AI agent dùng TOSE an toàn. Skill không phải template triển khai và không tự chạy gì. Xem [Skills: hướng dẫn cho agent](/vi/mcp/skills) để biết nội dung các skill.

::: tip Không cần đăng nhập
Danh mục là công khai (`GET /api/skills`), nên cả hai lệnh chạy được mà không cần API key.
:::

## tose skills list

Liệt kê các skill trong danh mục.

```bash
tose skills list
tose skills list --json
```

## tose skills install

Tải một skill và ghi các file của nó vào thư mục skills.

### Tóm tắt

```bash
tose skills install <name>[@version] [--dir <path>] [--global] [--force]
```

### Tham số và tùy chọn

| Tham số / tùy chọn | Mô tả |
|--------------------|-------|
| `<name>` | Tên skill, ví dụ `safe-rollback` |
| `@version` | Tùy chọn. Ghim phiên bản, ví dụ `safe-rollback@1.0.0` |
| `--dir <path>` | Cài vào thư mục skills khác thay vì mặc định |
| `--global` | Cài vào `~/.claude/skills` thay vì `./.claude/skills` |
| `--force` | Thay thế skill đã cài |

### Cách dùng

```bash
# Vào ./.claude/skills/safe-rollback
tose skills install safe-rollback

# Ghim phiên bản và cài cho mọi dự án
tose skills install safe-rollback@1.0.0 --global
```

### Vì sao an toàn

- **Kiểm tra trước.** Mọi file được tải về và đối chiếu với digest `sha256:` và kích thước trong danh mục **trước khi** ghi bất cứ thứ gì.
- **Từ chối toàn bộ.** Skill bị từ chối và không cài gì nếu thiếu hoặc sai định dạng digest, file không khớp, đường dẫn không an toàn (`..`, tuyệt đối, hoặc có dấu gạch ngược), hoặc URL file trỏ sang origin khác. Redirect không được theo.
- **Không thực thi gì.** File được ghi dạng văn bản thuần. CLI không bao giờ chạy bất cứ thứ gì bên trong skill.
- **Không ghi đè âm thầm.** Skill đã cài được giữ nguyên trừ khi bạn thêm `--force`.

Lỗi toàn vẹn thoát với mã `1` và `error.code` là `SKILL_INTEGRITY`.

::: warning Digest không phải chữ ký
Digest chứng minh bản tải khớp với danh mục. Cả hai đến từ cùng một máy chủ, nên độ tin cậy dựa vào việc kết nối tới host API chính thức của TOSE qua HTTPS.
:::

### Phiên bản

Danh mục chỉ phục vụ một phiên bản cho mỗi skill. Yêu cầu phiên bản khác sẽ lỗi `NOT_FOUND`, và `error.details.available_version` cho biết phiên bản hiện có.

## Liên quan

- [Skills: hướng dẫn cho agent](/vi/mcp/skills)
- [`tose deployment rollback`](/vi/commands/deployment#tose-deployment-rollback)
