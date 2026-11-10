import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TOSE CLI Documentation',
  description: 'Complete documentation for TOSE CLI - Deploy and manage your applications from the command line',

  // Maintainer files, not site pages.
  srcExclude: ['README.md', 'AGENTS.md'],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Commands', link: '/commands/overview' },
          { text: 'API', link: '/api/reference' }
        ],

        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'What is TOSE CLI?', link: '/' },
              { text: 'Installation', link: '/guide/installation' },
              { text: 'Getting Started', link: '/guide/getting-started' }
            ]
          },
          {
            text: 'Commands',
            items: [
              { text: 'Overview', link: '/commands/overview' },
              { text: 'tose login / logout', link: '/commands/login' },
              { text: 'tose init / use', link: '/commands/init' },
              { text: 'tose up', link: '/commands/up' },
              { text: 'tose deploy / redeploy', link: '/commands/deploy' },
              { text: 'tose deployment', link: '/commands/deployment' },
              { text: 'tose status', link: '/commands/status' },
              { text: 'tose logs', link: '/commands/logs' },
              { text: 'tose down / restart', link: '/commands/down' },
              { text: 'tose open', link: '/commands/open' },
              { text: 'tose env', link: '/commands/env' },
              { text: 'tose domain', link: '/commands/domain' },
              { text: 'tose db', link: '/commands/db' },
              { text: 'tose skills', link: '/commands/skills' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'tose template', link: '/commands/template' },
              { text: 'tose disk / volumes / pricing', link: '/commands/disk' },
              { text: 'tose autoscaling', link: '/commands/autoscaling' },
              { text: 'tose generate', link: '/commands/generate' }
            ]
          },
          {
            text: 'Configuration',
            items: [
              { text: 'Configuration File', link: '/guide/configuration' },
              { text: 'Environment Variables', link: '/guide/environment' },
              { text: 'Git Integration', link: '/guide/git' },
              { text: 'Dockerfile Examples', link: '/guide/dockerfile' },
              { text: 'Persistent Disks', link: '/guide/persistent-disks' },
              { text: 'Autoscaling budgets', link: '/guide/autoscaling-budgets' },
              { text: 'Dewee Template Runbook', link: '/guide/dewee-template' },
              { text: 'Pi model providers', link: '/guide/agent-pi-providers' },
              { text: 'Pricing', link: '/guide/pricing' },
              { text: 'Agent Runtime pricing', link: '/guide/agent-runtime-pricing' },
              { text: 'Self-hosting', link: '/guide/self-hosting' },
              { text: 'Referral program', link: '/guide/referral' },
              { text: 'Link an earlier enquiry', link: '/guide/link-enquiry' },
              { text: 'Blog and editorial MCP (planned)', link: '/guide/blog-and-editorial-mcp' }
            ]
          },
          {
            text: 'Cloud Desktops',
            items: [
              { text: 'Cloud Desktops Guide (Coming soon)', link: '/guide/cloud-desktops' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'Desktops API', link: '/api/desktops' }
            ]
          },
          {
            text: 'Cloud Harness',
            items: [
              { text: 'Cloud Harness Guide', link: '/guide/cloud-harness' },
              { text: 'Runtimes API', link: '/api/runtimes' }
            ]
          },
          {
            text: 'MCP and Agents',
            items: [
              { text: 'Protocol, OAuth and scopes', link: '/mcp/oauth' },
              { text: 'Tasks', link: '/mcp/tasks' },
              { text: 'Apps', link: '/mcp/apps' },
              { text: 'Skills', link: '/mcp/skills' },
              { text: 'Agent access', link: '/mcp/agent-access' },
              { text: 'Dewee template routes', link: '/mcp/dewee-template' },
              { text: 'Client compatibility', link: '/mcp/clients' }
            ]
          },
          {
            text: 'API Reference',
            items: [
              { text: 'REST API', link: '/api/reference' },
              { text: 'Authentication', link: '/api/authentication' },
              { text: 'API Keys & Scopes', link: '/api/api-keys' },
              { text: 'Audit Log', link: '/api/audit' },
              { text: 'Feedback', link: '/api/feedback' },
              { text: 'MCP Connector', link: '/mcp' },
              { text: 'Errors', link: '/api/errors' },
              { text: 'Sign-up Attribution', link: '/api/signup-attribution' },
              { text: 'Desktops', link: '/api/desktops' },
              { text: 'Runtimes', link: '/api/runtimes' },
              { text: 'Agent usage and budgets', link: '/api/agent-usage' },
              { text: 'Projects', link: '/api/projects' },
              { text: 'GitHub', link: '/api/github' },
              { text: 'Templates', link: '/api/templates' },
              { text: 'Template deploy and resume', link: '/api/template-deploy' },
              { text: 'Disks, Volumes & Pricing', link: '/api/disks' },
              { text: 'Autoscaling budget', link: '/api/autoscaling-budget' }
            ]
          }
        ]
      }
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi',
      themeConfig: {
        nav: [
          { text: 'Trang chủ', link: '/vi/' },
          { text: 'Hướng dẫn', link: '/vi/guide/getting-started' },
          { text: 'Lệnh', link: '/vi/commands/overview' },
          { text: 'API', link: '/vi/api/reference' }
        ],

        sidebar: [
          {
            text: 'Giới thiệu',
            items: [
              { text: 'TOSE CLI là gì?', link: '/vi/guide/introduction' },
              { text: 'Cài đặt', link: '/vi/guide/installation' },
              { text: 'Bắt đầu', link: '/vi/guide/getting-started' }
            ]
          },
          {
            text: 'Các lệnh',
            items: [
              { text: 'Tổng quan', link: '/vi/commands/overview' },
              { text: 'tose login / logout', link: '/vi/commands/login' },
              { text: 'tose init / use', link: '/vi/commands/init' },
              { text: 'tose up', link: '/vi/commands/up' },
              { text: 'tose deploy / redeploy', link: '/vi/commands/deploy' },
              { text: 'tose deployment', link: '/vi/commands/deployment' },
              { text: 'tose status', link: '/vi/commands/status' },
              { text: 'tose logs', link: '/vi/commands/logs' },
              { text: 'tose down / restart', link: '/vi/commands/down' },
              { text: 'tose open', link: '/vi/commands/open' },
              { text: 'tose env', link: '/vi/commands/env' },
              { text: 'tose domain', link: '/vi/commands/domain' },
              { text: 'tose db', link: '/vi/commands/db' },
              { text: 'tose skills', link: '/vi/commands/skills' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'tose template', link: '/vi/commands/template' },
              { text: 'tose disk / volumes / pricing', link: '/vi/commands/disk' },
              { text: 'tose autoscaling', link: '/vi/commands/autoscaling' },
              { text: 'tose generate', link: '/vi/commands/generate' }
            ]
          },
          {
            text: 'Cấu hình',
            items: [
              { text: 'File cấu hình', link: '/vi/guide/configuration' },
              { text: 'Biến môi trường', link: '/vi/guide/environment' },
              { text: 'Tích hợp Git', link: '/vi/guide/git' },
              { text: 'Ví dụ Dockerfile', link: '/vi/guide/dockerfile' },
              { text: 'Ổ đĩa bền vững', link: '/vi/guide/persistent-disks' },
              { text: 'Ngân sách autoscaling', link: '/vi/guide/autoscaling-budgets' },
              { text: 'Runbook template Dewee', link: '/vi/guide/dewee-template' },
              { text: 'Nhà cung cấp model cho Pi', link: '/vi/guide/agent-pi-providers' },
              { text: 'Bảng giá', link: '/vi/guide/pricing' },
              { text: 'Giá Agent Runtime', link: '/vi/guide/agent-runtime-pricing' },
              { text: 'Tự host', link: '/vi/guide/self-hosting' },
              { text: 'Chương trình giới thiệu', link: '/vi/guide/referral' },
              { text: 'Liên kết yêu cầu trước đó', link: '/vi/guide/link-enquiry' },
              { text: 'Blog và MCP biên tập (dự kiến)', link: '/vi/guide/blog-and-editorial-mcp' }
            ]
          },
          {
            text: 'Cloud Desktop',
            items: [
              { text: 'Hướng dẫn Cloud Desktop (Coming soon)', link: '/vi/guide/cloud-desktops' },
              { text: 'API Desktops (tiếng Anh)', link: '/api/desktops' }
            ]
          },
          {
            text: 'Cloud Harness',
            items: [
              { text: 'Hướng dẫn Cloud Harness', link: '/vi/guide/cloud-harness' },
              { text: 'API Runtimes', link: '/vi/api/runtimes' }
            ]
          },
          {
            text: 'MCP và Agent',
            items: [
              { text: 'Giao thức, OAuth và scope', link: '/vi/mcp/oauth' },
              { text: 'Tasks', link: '/vi/mcp/tasks' },
              { text: 'Apps', link: '/vi/mcp/apps' },
              { text: 'Skills', link: '/vi/mcp/skills' },
              { text: 'Agent access', link: '/vi/mcp/agent-access' },
              { text: 'Route của template Dewee', link: '/vi/mcp/dewee-template' },
              { text: 'Tương thích client', link: '/vi/mcp/clients' }
            ]
          },
          {
            text: 'Tài liệu API',
            items: [
              { text: 'REST API', link: '/vi/api/reference' },
              { text: 'Xác thực', link: '/vi/api/authentication' },
              { text: 'API key & Scope', link: '/vi/api/api-keys' },
              { text: 'Audit log', link: '/vi/api/audit' },
              { text: 'Feedback', link: '/vi/api/feedback' },
              { text: 'MCP Connector', link: '/vi/mcp' },
              { text: 'Mã lỗi', link: '/vi/api/errors' },
              { text: 'Runtimes', link: '/vi/api/runtimes' },
              { text: 'Usage và hạn mức agent', link: '/vi/api/agent-usage' },
              { text: 'Dự án', link: '/vi/api/projects' },
              { text: 'GitHub', link: '/vi/api/github' },
              { text: 'Template', link: '/vi/api/templates' },
              { text: 'Attribution khi đăng ký', link: '/vi/api/signup-attribution' },
              { text: 'Deploy và resume template', link: '/vi/api/template-deploy' },
              { text: 'Ổ đĩa, Volume & Bảng giá', link: '/vi/api/disks' },
              { text: 'API ngân sách autoscaling', link: '/vi/api/autoscaling-budget' }
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
      { icon: 'github', link: 'https://github.com/tosesh/tose' }
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
