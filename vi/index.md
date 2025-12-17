---
layout: home

hero:
  name: TOSE CLI
  text: Triển khai Đơn Giản
  tagline: Công cụ dòng lệnh mạnh mẽ để triển khai và quản lý ứng dụng một cách dễ dàng
  actions:
    - theme: brand
      text: Bắt đầu
      link: /vi/guide/getting-started
    - theme: alt
      text: Xem các lệnh
      link: /vi/commands/overview
    - theme: alt
      text: GitHub
      link: https://github.com/tosesh/tose

features:
  - icon: 🚀
    title: Triển khai nhanh
    details: Triển khai ứng dụng trong vài giây với tích hợp Git thông minh và tự động phát hiện cấu hình.
  - icon: 🔧
    title: Cấu hình dễ dàng
    details: Giao diện tương tác hướng dẫn bạn qua việc thiết lập. Hỗ trợ nhiều file .env với tính năng merge thông minh và phát hiện xung đột.
  - icon: 📊
    title: Giám sát thời gian thực
    details: Kiểm tra trạng thái triển khai và theo dõi log theo thời gian thực với màu sắc phân loại và tùy chọn lọc.
  - icon: 🌳
    title: Tích hợp Git
    details: Tự động phát hiện Git repository, nhánh và remote. Hỗ trợ GitHub, GitLab và Bitbucket.
  - icon: 🔐
    title: Bảo mật mặc định
    details: Xác thực bằng API key với lưu trữ an toàn. Tự động che giấu biến môi trường nhạy cảm.
  - icon: 💼
    title: Quản lý Workspace
    details: Hỗ trợ nhiều workspace và dự án. Cộng tác nhóm với API key theo workspace.
---

## Bắt đầu nhanh

Cài đặt TOSE CLI toàn cục với npm:

```bash
npm install -g @tosesh/tose
```

Triển khai ứng dụng đầu tiên:

```bash
cd your-project
tose up
```

TOSE CLI sẽ hướng dẫn bạn qua:
- Xác thực API key
- Chọn workspace
- Tạo dự án
- Cấu hình Git repository
- Thiết lập biến môi trường
- Triển khai

## Tại sao chọn TOSE CLI?

### Thân thiện với nhà phát triển

TOSE CLI được thiết kế với trải nghiệm nhà phát triển là ưu tiên. Giao diện tương tác, giá trị mặc định thông minh và thông báo lỗi hữu ích giúp triển khai trở nên đơn giản.

```bash
# Kiểm tra trạng thái triển khai
tose status

# Xem logs với bộ lọc
tose logs -n 100

# Dừng triển khai
tose down
```

### Tự động hóa thông minh

Tự động phát hiện Git repository, nhánh và file môi trường của bạn. TOSE CLI xử lý các công việc nặng nhọc để bạn tập trung vào phát triển.

### Sẵn sàng cho Production

Được xây dựng với TypeScript, xử lý lỗi toàn diện và quy trình làm việc đã được kiểm tra. Sẵn sàng cho cả dự án cá nhân và triển khai doanh nghiệp.

## Tính năng chính

- **CLI tương tác** - Thiết lập hướng dẫn với xác thực và gợi ý hữu ích
- **Triển khai qua Git** - Tự động triển khai từ Git repository của bạn
- **Quản lý môi trường** - Hỗ trợ nhiều file .env với merge và che giấu
- **Logs thời gian thực** - Theo dõi log triển khai với đầu ra phân màu
- **Hỗ trợ Workspace** - Quản lý nhiều dự án trên các workspace khác nhau
- **Cache cấu hình** - Lưu API key và tùy chọn cục bộ

## Tiếp theo là gì?

<div class="vp-doc">

- [Bắt đầu](/vi/guide/getting-started) - Cài đặt và triển khai ứng dụng đầu tiên
- [Tổng quan các lệnh](/vi/commands/overview) - Tìm hiểu về các lệnh có sẵn
- [Cấu hình](/vi/guide/configuration) - Cấu hình TOSE CLI theo nhu cầu
- [Tài liệu API](/vi/api/reference) - Tài liệu REST API

</div>

## Cộng đồng & Hỗ trợ

- [GitHub Issues](https://github.com/tosesh/tose/issues) - Báo cáo lỗi hoặc yêu cầu tính năng
- [Tài liệu](/) - Hướng dẫn đầy đủ và tài liệu API
- Email: tobi@wearetopgroup.com

---

<div style="text-align: center; margin-top: 2rem; color: #6b7280;">
  <p>Được xây dựng với ❤️ bởi đội ngũ TOSE</p>
  <p style="font-size: 0.875rem;">Phiên bản 0.0.2 | Phát hành theo giấy phép ISC</p>
</div>
