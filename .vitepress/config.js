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
              { text: 'Pricing', link: '/guide/pricing' },
              { text: 'Self-hosting', link: '/guide/self-hosting' }
            ]
          },
          {
            text: 'Cloud Desktops',
            items: [
              { text: 'Cloud Desktops Guide', link: '/guide/cloud-desktops' },
              { text: 'tose desktop', link: '/commands/desktop' },
              { text: 'Desktops API', link: '/api/desktops' }
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
              { text: 'MCP Connector', link: '/mcp' },
              { text: 'Endpoints', link: '/api/endpoints' },
              { text: 'Errors', link: '/api/errors' },
              { text: 'Desktops', link: '/api/desktops' },
              { text: 'Disks, Volumes & Pricing', link: '/api/disks' }
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
              { text: 'Bảng giá', link: '/vi/guide/pricing' },
              { text: 'Tự host', link: '/vi/guide/self-hosting' }
            ]
          },
          {
            text: 'Cloud Desktop',
            items: [
              { text: 'Hướng dẫn Cloud Desktop', link: '/vi/guide/cloud-desktops' },
              { text: 'API Desktops (tiếng Anh)', link: '/api/desktops' }
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
              { text: 'MCP Connector', link: '/vi/mcp' },
              { text: 'Endpoints', link: '/vi/api/endpoints' },
              { text: 'Mã lỗi', link: '/vi/api/errors' },
              { text: 'Ổ đĩa, Volume & Bảng giá', link: '/vi/api/disks' }
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
