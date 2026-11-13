import { defineConfig } from 'vitepress'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { SITE_URL, seoHead } from './seo-head.js'
import { writeLlmsTxt } from './llms-txt.js'

export default defineConfig({
  title: 'TOSE Docs',
  description: 'Documentation for the TOSE cloud platform: deploy apps with the CLI, connect AI agents over MCP, and integrate with the REST API.',

  // Pages are served without the .html suffix; Cloudflare Pages redirects the suffixed form.
  cleanUrls: true,
  sitemap: { hostname: SITE_URL },
  transformHead: seoHead,

  // Publish each page's Markdown source next to its HTML, for "Copy as Markdown" and for agents,
  // and list them in /llms.txt.
  buildEnd(siteConfig) {
    for (const page of siteConfig.pages) {
      const target = join(siteConfig.outDir, page)
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(join(siteConfig.srcDir, page), target)
    }
    writeLlmsTxt(siteConfig)
  },

  // Dark is the brand default; visitors can still switch to light.
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '32x32' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Unbounded:wght@500;600;700&display=swap&subset=vietnamese'
    }]
  ],

  // Maintainer files, not site pages.
  srcExclude: ['README.md', 'AGENTS.md'],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Deploy', link: '/guide/deploy-an-app' },
          { text: 'CLI', link: '/commands/overview' },
          { text: 'MCP', link: '/guide/connect-an-agent' },
          { text: 'Cloud Agents', link: '/guide/cloud-agents' },
          { text: 'API', link: '/guide/integrate-the-api' }
        ],

        sidebar: [
          {
            text: 'Start here',
            items: [
              { text: 'What is TOSE CLI?', link: '/guide/introduction' },
              { text: 'Installation', link: '/guide/installation' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Deploy an app', link: '/guide/deploy-an-app' },
              { text: 'Connect an AI agent (MCP)', link: '/guide/connect-an-agent' },
              { text: 'Integrate via REST API', link: '/guide/integrate-the-api' }
            ]
          },
          {
            text: 'CLI commands',
            items: [
              { text: 'Overview', link: '/commands/overview' },
              { text: 'tose login / logout', link: '/commands/login' },
              { text: 'tose init / use', link: '/commands/init' },
              { text: 'tose up', link: '/commands/up' },
              { text: 'tose deploy / redeploy', link: '/commands/deploy' },
              { text: 'tose deployment', link: '/commands/deployment' },
              { text: 'tose ci', link: '/commands/ci' },
              { text: 'tose analytics', link: '/commands/analytics' },
              { text: 'tose runbook', link: '/commands/runbook' },
              { text: 'tose status', link: '/commands/status' },
              { text: 'tose logs', link: '/commands/logs' },
              { text: 'tose down / restart', link: '/commands/down' },
              { text: 'tose open', link: '/commands/open' },
              { text: 'tose env', link: '/commands/env' },
              { text: 'tose domain', link: '/commands/domain' },
              { text: 'tose db', link: '/commands/db' },
              { text: 'tose export', link: '/commands/export' },
              { text: 'tose skills', link: '/commands/skills' },
              { text: 'tose feedback', link: '/commands/feedback' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'tose template', link: '/commands/template' },
              { text: 'tose sidecars', link: '/commands/sidecars' },
              { text: 'tose templates', link: '/commands/templates' },
              { text: 'tose disk / volumes / pricing', link: '/commands/disk' },
              { text: 'tose autoscaling', link: '/commands/autoscaling' },
              { text: 'tose generate', link: '/commands/generate' }
            ]
          },
          {
            text: 'Deploy and configure',
            items: [
              { text: 'Configuration File', link: '/guide/configuration' },
              { text: 'Environment Variables', link: '/guide/environment' },
              { text: 'Git Integration', link: '/guide/git' },
              { text: 'Deploy on TOSE button', link: '/guide/deploy-button' },
              { text: 'Dockerfile Examples', link: '/guide/dockerfile' },
              { text: 'Persistent Disks', link: '/guide/persistent-disks' },
              { text: 'Project Sidecars', link: '/guide/project-sidecars' },
              { text: 'Dewee Template Runbook', link: '/guide/dewee-template' },
              { text: 'Template registry (early access)', link: '/guide/template-registry' },
              { text: 'Registry templates: probes and upgrade', link: '/guide/template-upgrades' },
              { text: 'Template directory', link: '/guide/template-directory' },
              { text: 'Custom domains', link: '/guide/custom-domains' }
            ]
          },
          {
            text: 'CI',
            items: [
              { text: 'CI impact selection', link: '/guide/ci-impact-selection' },
              { text: 'CI usage and budget caps', link: '/guide/ci-usage-and-budgets' },
              { text: 'CI in the dashboard', link: '/guide/ci-dashboard' },
              { text: 'CI artifacts, reports and issue drafts', link: '/guide/ci-artifacts' },
              { text: 'CI triggers and fork approval', link: '/guide/ci-triggers-and-forks' }
            ]
          },
          {
            text: 'Operate and troubleshoot',
            items: [
              { text: 'Autoscaling budgets', link: '/guide/autoscaling-budgets' },
              { text: 'Recovery runbooks', link: '/guide/recovery-runbooks' },
              { text: 'Report a problem', link: '/guide/dashboard-feedback' },
              { text: 'Operations across workspaces', link: '/guide/operations-overview' },
              { text: 'Workload metrics', link: '/guide/workload-metrics' },
              { text: 'Notifications inbox', link: '/guide/notifications' },
              { text: 'Troubleshooting', link: '/guide/troubleshooting' }
            ]
          },
          {
            text: 'Cloud Agents',
            items: [
              { text: 'Overview', link: '/guide/cloud-agents' },
              { text: 'Deploy a coding agent', link: '/guide/deploy-coding-agent' },
              { text: 'Delegate tasks to a coding agent', link: '/guide/agent-tasks' },
              { text: 'GitHub repository for coding agents', link: '/guide/agent-repository-checkout' },
              { text: 'Network modes for coding agents', link: '/guide/agent-network-modes' },
              { text: 'Pi model providers', link: '/guide/agent-pi-providers' },
              { text: 'Agent environment and auto-sleep', link: '/guide/agent-environment-and-auto-sleep' },
            ]
          },
          {
            text: 'AI agents and MCP',
            items: [
              { text: 'Agent Runtime pricing', link: '/guide/agent-runtime-pricing' },
              { text: 'Blog publishing via MCP', link: '/guide/blog-and-editorial-mcp' },
              { text: 'Protocol, OAuth and scopes', link: '/mcp/oauth' },
              { text: 'Tasks', link: '/mcp/tasks' },
              { text: 'Apps', link: '/mcp/apps' },
              { text: 'Skills', link: '/mcp/skills' },
              { text: 'Agent access', link: '/mcp/agent-access' },
              { text: 'Dewee template routes', link: '/mcp/dewee-template' },
              { text: 'Client compatibility', link: '/mcp/clients' },
              { text: 'MCP Connector', link: '/mcp' }
            ]
          },
          {
            text: 'Cloud Harness and Desktops',
            items: [
              { text: 'Cloud Desktops Guide (Coming soon)', link: '/guide/cloud-desktops' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'Desktops API', link: '/api/desktops' },
              { text: 'Cloud Harness Guide', link: '/guide/cloud-harness' },
              { text: 'Runtimes API', link: '/api/runtimes' }
            ]
          },
          {
            text: 'Billing and account',
            items: [
              { text: 'Pricing', link: '/guide/pricing' },
              { text: 'Self-hosting', link: '/guide/self-hosting' },
              { text: 'Referral program', link: '/guide/referral' },
              { text: 'Promo codes', link: '/guide/promo-codes' },
              { text: 'Link an earlier enquiry', link: '/guide/link-enquiry' }
            ]
          },
          {
            text: 'REST API reference',
            items: [
              { text: 'REST API', link: '/api/reference' },
              { text: 'Authentication', link: '/api/authentication' },
              { text: 'API Keys & Scopes', link: '/api/api-keys' },
              { text: 'Audit Log', link: '/api/audit' },
              { text: 'Feedback', link: '/api/feedback' },
              { text: 'Support assistant token', link: '/api/support-assistant' },
              { text: 'Promo codes', link: '/api/promo-codes' },
              { text: 'Errors', link: '/api/errors' },
              { text: 'Sign-up Attribution', link: '/api/signup-attribution' },
              { text: 'Desktops', link: '/api/desktops' },
              { text: 'Runtimes', link: '/api/runtimes' },
              { text: 'Agent usage and budgets', link: '/api/agent-usage' },
              { text: 'Workspace analytics', link: '/api/analytics' },
              { text: 'Projects', link: '/api/projects' },
              { text: 'GitHub', link: '/api/github' },
              { text: 'Templates', link: '/api/templates' },
              { text: 'Template registry', link: '/api/template-registry' },
              { text: 'Template deploy and resume', link: '/api/template-deploy' },
              { text: 'Disks, Volumes & Pricing', link: '/api/disks' },
              { text: 'Autoscaling budget', link: '/api/autoscaling-budget' },
              { text: 'CI suggestions', link: '/api/ci-suggestions' },
              { text: 'CI usage and budget', link: '/api/ci-usage-budget' },
              { text: 'CI artifacts and reports', link: '/api/ci-artifacts' }
            ]
          }
        ]
      }
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi',
      description: 'Tài liệu nền tảng đám mây TOSE: triển khai ứng dụng bằng CLI, kết nối AI agent qua MCP và tích hợp REST API.',
      themeConfig: {
        nav: [
          { text: 'Trang chủ', link: '/vi/' },
          { text: 'Triển khai', link: '/vi/guide/deploy-an-app' },
          { text: 'CLI', link: '/vi/commands/overview' },
          { text: 'MCP', link: '/vi/guide/connect-an-agent' },
          { text: 'Cloud Agents', link: '/vi/guide/cloud-agents' },
          { text: 'API', link: '/vi/guide/integrate-the-api' }
        ],

        sidebar: [
          {
            text: 'Bắt đầu',
            items: [
              { text: 'TOSE CLI là gì?', link: '/vi/guide/introduction' },
              { text: 'Cài đặt', link: '/vi/guide/installation' },
              { text: 'Bắt đầu', link: '/vi/guide/getting-started' },
              { text: 'Triển khai ứng dụng', link: '/vi/guide/deploy-an-app' },
              { text: 'Kết nối AI agent (MCP)', link: '/vi/guide/connect-an-agent' },
              { text: 'Tích hợp REST API', link: '/vi/guide/integrate-the-api' }
            ]
          },
          {
            text: 'Lệnh CLI',
            items: [
              { text: 'Tổng quan', link: '/vi/commands/overview' },
              { text: 'tose login / logout (tiếng Anh)', link: '/commands/login' },
              { text: 'tose init / use (tiếng Anh)', link: '/commands/init' },
              { text: 'tose up', link: '/vi/commands/up' },
              { text: 'tose deploy / redeploy', link: '/vi/commands/deploy' },
              { text: 'tose deployment', link: '/vi/commands/deployment' },
              { text: 'tose ci', link: '/vi/commands/ci' },
              { text: 'tose analytics', link: '/vi/commands/analytics' },
              { text: 'tose runbook', link: '/vi/commands/runbook' },
              { text: 'tose status', link: '/vi/commands/status' },
              { text: 'tose logs', link: '/vi/commands/logs' },
              { text: 'tose down / restart', link: '/vi/commands/down' },
              { text: 'tose open (tiếng Anh)', link: '/commands/open' },
              { text: 'tose env', link: '/vi/commands/env' },
              { text: 'tose domain (tiếng Anh)', link: '/commands/domain' },
              { text: 'tose db', link: '/vi/commands/db' },
              { text: 'tose export', link: '/vi/commands/export' },
              { text: 'tose skills', link: '/vi/commands/skills' },
              { text: 'tose feedback', link: '/vi/commands/feedback' },
              { text: 'tose desktop (tiếng Anh)', link: '/commands/desktop' },
              { text: 'tose template', link: '/vi/commands/template' },
              { text: 'tose sidecars', link: '/vi/commands/sidecars' },
              { text: 'tose templates', link: '/vi/commands/templates' },
              { text: 'tose disk / volumes / pricing', link: '/vi/commands/disk' },
              { text: 'tose autoscaling', link: '/vi/commands/autoscaling' },
              { text: 'tose generate (tiếng Anh)', link: '/commands/generate' }
            ]
          },
          {
            text: 'Triển khai và cấu hình',
            items: [
              { text: 'File cấu hình', link: '/vi/guide/configuration' },
              { text: 'Biến môi trường', link: '/vi/guide/environment' },
              { text: 'Tích hợp Git', link: '/vi/guide/git' },
              { text: 'Nút Deploy on TOSE', link: '/vi/guide/deploy-button' },
              { text: 'Ví dụ Dockerfile', link: '/vi/guide/dockerfile' },
              { text: 'Ổ đĩa bền vững', link: '/vi/guide/persistent-disks' },
              { text: 'Sidecar của dự án', link: '/vi/guide/project-sidecars' },
              { text: 'Runbook template Dewee', link: '/vi/guide/dewee-template' },
              { text: 'Template registry (truy cập sớm)', link: '/vi/guide/template-registry' },
              { text: 'Template registry: probe và nâng cấp', link: '/vi/guide/template-upgrades' },
              { text: 'Thư mục template', link: '/vi/guide/template-directory' },
              { text: 'Tên miền tùy chỉnh', link: '/vi/guide/custom-domains' }
            ]
          },
          {
            text: 'CI',
            items: [
              { text: 'Chọn job CI theo ảnh hưởng', link: '/vi/guide/ci-impact-selection' },
              { text: 'Mức sử dụng CI và hạn mức', link: '/vi/guide/ci-usage-and-budgets' },
              { text: 'CI trong dashboard', link: '/vi/guide/ci-dashboard' },
              { text: 'Artifact CI, báo cáo và bản nháp issue', link: '/vi/guide/ci-artifacts' },
              { text: 'Trigger CI và duyệt fork', link: '/vi/guide/ci-triggers-and-forks' }
            ]
          },
          {
            text: 'Vận hành và khắc phục sự cố',
            items: [
              { text: 'Ngân sách autoscaling', link: '/vi/guide/autoscaling-budgets' },
              { text: 'Runbook khôi phục', link: '/vi/guide/recovery-runbooks' },
              { text: 'Báo vấn đề từ dashboard', link: '/vi/guide/dashboard-feedback' },
              { text: 'Vận hành trên nhiều workspace', link: '/vi/guide/operations-overview' },
              { text: 'Số liệu workload', link: '/vi/guide/workload-metrics' },
              { text: 'Hộp thư thông báo', link: '/vi/guide/notifications' },
              { text: 'Troubleshooting (tiếng Anh)', link: '/guide/troubleshooting' }
            ]
          },
          {
            text: 'Cloud Agents',
            items: [
              { text: 'Tổng quan', link: '/vi/guide/cloud-agents' },
              { text: 'Triển khai coding agent', link: '/vi/guide/deploy-coding-agent' },
              { text: 'Giao tác vụ cho coding agent', link: '/vi/guide/agent-tasks' },
              { text: 'Kho mã GitHub cho coding agent', link: '/vi/guide/agent-repository-checkout' },
              { text: 'Chế độ mạng cho coding agent', link: '/vi/guide/agent-network-modes' },
              { text: 'Nhà cung cấp model cho Pi', link: '/vi/guide/agent-pi-providers' },
              { text: 'Biến môi trường và tự động ngủ của agent', link: '/vi/guide/agent-environment-and-auto-sleep' },
            ]
          },
          {
            text: 'AI agent và MCP',
            items: [
              { text: 'Giá Agent Runtime', link: '/vi/guide/agent-runtime-pricing' },
              { text: 'Đăng blog qua MCP', link: '/vi/guide/blog-and-editorial-mcp' },
              { text: 'Giao thức, OAuth và scope', link: '/vi/mcp/oauth' },
              { text: 'Tasks', link: '/vi/mcp/tasks' },
              { text: 'Apps', link: '/vi/mcp/apps' },
              { text: 'Skills', link: '/vi/mcp/skills' },
              { text: 'Agent access', link: '/vi/mcp/agent-access' },
              { text: 'Route của template Dewee', link: '/vi/mcp/dewee-template' },
              { text: 'Tương thích client', link: '/vi/mcp/clients' },
              { text: 'MCP Connector', link: '/vi/mcp' }
            ]
          },
          {
            text: 'Cloud Harness và Desktop',
            items: [
              { text: 'Hướng dẫn Cloud Desktop (Coming soon)', link: '/vi/guide/cloud-desktops' },
              { text: 'API Desktops (tiếng Anh)', link: '/api/desktops' },
              { text: 'Hướng dẫn Cloud Harness', link: '/vi/guide/cloud-harness' },
              { text: 'API Runtimes', link: '/vi/api/runtimes' }
            ]
          },
          {
            text: 'Thanh toán và tài khoản',
            items: [
              { text: 'Bảng giá', link: '/vi/guide/pricing' },
              { text: 'Tự host', link: '/vi/guide/self-hosting' },
              { text: 'Chương trình giới thiệu', link: '/vi/guide/referral' },
              { text: 'Mã khuyến mãi', link: '/vi/guide/promo-codes' },
              { text: 'Liên kết yêu cầu trước đó', link: '/vi/guide/link-enquiry' }
            ]
          },
          {
            text: 'Tài liệu REST API',
            items: [
              { text: 'REST API', link: '/vi/api/reference' },
              { text: 'Xác thực', link: '/vi/api/authentication' },
              { text: 'API key & Scope', link: '/vi/api/api-keys' },
              { text: 'Audit log', link: '/vi/api/audit' },
              { text: 'Feedback', link: '/vi/api/feedback' },
              { text: 'Support token của trợ lý', link: '/vi/api/support-assistant' },
              { text: 'Mã khuyến mãi', link: '/vi/api/promo-codes' },
              { text: 'Mã lỗi', link: '/vi/api/errors' },
              { text: 'Runtimes', link: '/vi/api/runtimes' },
              { text: 'Usage và hạn mức agent', link: '/vi/api/agent-usage' },
              { text: 'Analytics của workspace', link: '/vi/api/analytics' },
              { text: 'Dự án', link: '/vi/api/projects' },
              { text: 'GitHub', link: '/vi/api/github' },
              { text: 'Template', link: '/vi/api/templates' },
              { text: 'Template registry', link: '/vi/api/template-registry' },
              { text: 'Attribution khi đăng ký', link: '/vi/api/signup-attribution' },
              { text: 'Deploy và resume template', link: '/vi/api/template-deploy' },
              { text: 'Ổ đĩa, Volume & Bảng giá', link: '/vi/api/disks' },
              { text: 'API ngân sách autoscaling', link: '/vi/api/autoscaling-budget' },
              { text: 'Gợi ý CI', link: '/vi/api/ci-suggestions' },
              { text: 'Mức sử dụng CI và hạn mức', link: '/vi/api/ci-usage-budget' },
              { text: 'Artifact và báo cáo CI', link: '/vi/api/ci-artifacts' }
            ]
          }
        ],

        outline: {
          label: 'Trên trang này'
        },

        docFooter: {
          prev: 'Trang trước',
          next: 'Trang sau'
        },

        darkModeSwitchLabel: 'Chế độ tối',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Về đầu trang'
      }
    }
  },

  themeConfig: {
    socialLinks: [
      { icon: 'npm', link: 'https://www.npmjs.com/package/@tosesh/tose' }
    ],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2025-present TOSE'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          vi: {
            translations: {
              button: {
                buttonText: 'Tìm kiếm',
                buttonAriaLabel: 'Tìm kiếm'
              },
              modal: {
                noResultsText: 'Không tìm thấy kết quả',
                resetButtonTitle: 'Xóa tìm kiếm',
                footer: {
                  selectText: 'để chọn',
                  navigateText: 'để di chuyển',
                  closeText: 'để đóng'
                }
              }
            }
          }
        }
      }
    }
  }
})
