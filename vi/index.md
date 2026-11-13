---
layout: home
title: "Tài liệu TOSE: triển khai ứng dụng, kết nối AI agent, tích hợp API"
titleTemplate: false
description: "Tài liệu nền tảng đám mây TOSE: triển khai ứng dụng bằng CLI, kết nối AI agent qua MCP và tích hợp REST API."

hero:
  name: Tài liệu TOSE
  text: Triển khai, vận hành và tự động hóa trên TOSE
  tagline: Nền tảng đám mây trả trước cho ứng dụng và AI agent. Dùng CLI, kết nối MCP agent hoặc gọi REST API.
  actions:
    - theme: brand
      text: Triển khai ứng dụng
      link: /vi/guide/deploy-an-app
    - theme: alt
      text: CLI
      link: /vi/commands/overview
    - theme: alt
      text: Kết nối AI agent (MCP)
      link: /vi/guide/connect-an-agent
    - theme: alt
      text: Tích hợp REST API
      link: /vi/guide/integrate-the-api

features:
  - title: Triển khai ứng dụng
    details: Cài CLI, đăng nhập và triển khai một kho Git bằng tose up, rồi kiểm tra ứng dụng đang chạy.
    link: /vi/guide/deploy-an-app
    linkText: Bắt đầu hướng dẫn
  - title: CLI
    details: Mọi lệnh của @tosesh/tose, có --json cho script và CI.
    link: /vi/commands/overview
    linkText: Tra cứu lệnh
  - title: Kết nối AI agent (MCP)
    details: Cấp cho Claude hoặc MCP client khác quyền có giới hạn vào một workspace. Deploy và rollback chờ bạn phê duyệt.
    link: /vi/guide/connect-an-agent
    linkText: Kết nối client
  - title: Tích hợp REST API
    details: Một hợp đồng OpenAPI 3.1 có phiên bản, API key có scope và mã lỗi ổn định.
    link: /vi/guide/integrate-the-api
    linkText: Gọi API
---

## Bắt đầu nhanh

```bash
npm install -g @tosesh/tose
tose login
cd my-app
tose up
```

Sau đó làm theo [Triển khai ứng dụng](/vi/guide/deploy-an-app) để kiểm tra deployment.

## Tìm hiểu thêm

- [Cloud Harness](/vi/guide/cloud-harness) và [coding agent](/vi/guide/deploy-coding-agent)
- [Cấu hình](/vi/guide/configuration), [biến môi trường](/vi/guide/environment) và [tên miền tùy chỉnh](/vi/guide/custom-domains)
- [Bảng giá](/vi/guide/pricing) và [khắc phục sự cố](/guide/troubleshooting) (tiếng Anh)
