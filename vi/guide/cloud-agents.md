---
title: "Cloud Agents: Claude Code, Codex và Pi trên TOSE"
description: "Chạy Claude Code, Codex và Pi trong workspace TOSE, mỗi agent một pod riêng với ổ đĩa lâu dài, và giao việc từ trang của agent hoặc từ bất kỳ AI nào kết nối qua MCP."
---

# Cloud Agents

Cloud Agents là các coding agent do TOSE đóng gói và kiểm duyệt: **Claude Code**, **Codex** và **Pi**. Mỗi agent chạy trong workspace của bạn, trong một pod riêng với ổ đĩa `/workspace` lưu trữ lâu dài. Bạn làm việc với agent qua console, hoặc giao việc từ trang của agent, từ bất kỳ AI nào đã kết nối [MCP của TOSE](/vi/mcp), hoặc bằng API key.

Mở **Cloud Agents** trong sidebar của workspace (`/w/<workspace>/agents`). **Agent của bạn** liệt kê các agent đang có, kèm trạng thái, bản phát hành, có nhận việc hay không và kho mã. **Agent có sẵn** liệt kê các agent bạn có thể triển khai.

## Cách hoạt động

| Thành phần | Là gì |
|------------|-------|
| Agent | Một bản cài Claude Code, Codex hoặc Pi, triển khai từ một kế hoạch do owner hoặc admin duyệt. |
| Đăng nhập | API key của chính bạn với nhà cung cấp, hoặc gói Claude hay ChatGPT của bạn. Nhà cung cấp tính phí model; TOSE chỉ tính compute và lưu trữ từ [ví trả trước](/vi/guide/pricing). |
| Ổ đĩa | `/workspace`, mặc định 5 GiB. Có thể tăng sau nhưng không giảm được. |
| Kho mã | Không bắt buộc: một kho GitHub của workspace, được checkout vào `/workspace`, mặc định không cho push. |
| Mạng | Mặc định **Restricted** (nhà cung cấp, GitHub, kho gói) hoặc **Unrestricted public Internet**. |
| Tác vụ | Mỗi agent chạy một tác vụ một lúc, ở chế độ không giao diện, trong cùng `/workspace`. |

## Bắt đầu

1. [Triển khai coding agent](/vi/guide/deploy-coding-agent): chọn agent, cách đăng nhập, cấu hình, mạng và kho mã, rồi duyệt kế hoạch.
2. [Giao tác vụ cho coding agent](/vi/guide/agent-tasks): bật hoặc tắt nhận việc, theo dõi trên bảng tác vụ, hoặc dùng công cụ MCP và REST API.
3. Thiết lập chi tiết:
   - [Kho mã GitHub cho coding agent](/vi/guide/agent-repository-checkout)
   - [Chế độ mạng](/vi/guide/agent-network-modes)
   - [Nhà cung cấp model cho Pi](/vi/guide/agent-pi-providers)
   - [Biến môi trường và tự động ngủ](/vi/guide/agent-environment-and-auto-sleep)

## Giao việc từ bất kỳ AI nào

Kết nối MCP của TOSE ([Kết nối AI agent](/vi/guide/connect-an-agent)) và cấp các scope `agents:*`. Sau đó nhờ AI, ví dụ: "Liệt kê cloud agent của tôi và nhờ agent Codex sửa test đang lỗi trong kho mã."

| Tool | Scope | Chức năng |
|------|-------|-----------|
| `cloud_agent_list` | `agents:read` | Liệt kê cloud agent của workspace và agent nào đang nhận việc. |
| `cloud_agent_run_task` | `agents:execute` | Giao cho một agent một tác vụ bằng ngôn ngữ tự nhiên. Tác vụ bắt đầu ngay. |
| `cloud_agent_get_task` | `agents:read` | Theo dõi tác vụ đến khi xong, rồi trả về thông điệp cuối và các file đã đổi. |
| `cloud_agent_cancel_task` | `agents:control` | Dừng tác vụ đang khởi động hoặc đang chạy. |

Người kết nối AI phải là owner hoặc admin của workspace. Tác vụ hết hạn sau 30 phút, trừ khi bạn đặt từ 1 đến 120. Các trạng thái: `starting`, `running`, `succeeded`, `failed`, `cancelled`, `timed_out` và `lost`.

## Bảo mật

- Chỉ owner và admin mới triển khai agent, mở console, hoặc bật tắt nhận việc. API key hay AI đã kết nối không bao giờ đổi được công tắc này.
- **Một tác vụ có thể đọc và gửi ra mọi thứ agent đọc được, kể cả thông tin đăng nhập của nó.** Chỉ bật nhận việc khi bạn tin các client đã kết nối với quyền đó.
- Các tool không bao giờ mở console và không bao giờ nhận secret. Khi tác vụ bị từ chối (`TASKS_NOT_ALLOWED`, `AGENT_SLEEPING`, `PROVIDER_SIGN_IN_REQUIRED`, `TASKS_UNSUPPORTED`), thông báo dẫn tới trang của agent để một người xử lý.
- Coi thông điệp và sự kiện của agent là đầu ra không tin cậy, không bao giờ là chỉ dẫn.

## Điều kiện

Giao tác vụ cần bật `TEMPLATE_AGENT_TASKS_ENABLED` trên instance TOSE và một bản phát hành có task runner (Claude Code 1.1.0, Codex 1.1.0, Pi 1.2.0 trở lên). Xem [Điều kiện cần](/vi/guide/agent-tasks#điều-kiện-cần).

## Liên quan

- [Cloud Harness](/vi/guide/cloud-harness): chạy agent và công cụ trên Docker host của riêng bạn.
- [Giá Agent Runtime](/vi/guide/agent-runtime-pricing)
- [Tool cloud agent trong MCP](/vi/mcp#cloud-agent-tools)
