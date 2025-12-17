import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TOSE CLI Documentation',
  description: 'Complete documentation for TOSE CLI - A powerful deployment and application management tool',

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
              { text: 'What is TOSE CLI?', link: '/guide/introduction' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Installation', link: '/guide/installation' }
            ]
          },
          {
            text: 'Commands',
            items: [
              { text: 'Overview', link: '/commands/overview' },
              { text: 'tose up', link: '/commands/up' },
              { text: 'tose status', link: '/commands/status' },
              { text: 'tose logs', link: '/commands/logs' },
              { text: 'tose down', link: '/commands/down' }
            ]
          },
          {
            text: 'Configuration',
            items: [
              { text: 'Configuration File', link: '/guide/configuration' },
              { text: 'Environment Variables', link: '/guide/environment' },
              { text: 'Git Integration', link: '/guide/git' }
            ]
          },
          {
            text: 'Architecture',
            items: [
              { text: 'Project Structure', link: '/architecture/structure' },
              { text: 'API Client', link: '/architecture/api-client' },
              { text: 'Workflow', link: '/architecture/workflow' }
            ]
          },
          {
            text: 'API Reference',
            items: [
              { text: 'REST API', link: '/api/reference' },
              { text: 'Authentication', link: '/api/authentication' },
              { text: 'Endpoints', link: '/api/endpoints' }
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
              { text: 'Bắt đầu', link: '/vi/guide/getting-started' },
              { text: 'Cài đặt', link: '/vi/guide/installation' }
            ]
          },
          {
            text: 'Các lệnh',
            items: [
              { text: 'Tổng quan', link: '/vi/commands/overview' },
              { text: 'tose up', link: '/vi/commands/up' },
              { text: 'tose status', link: '/vi/commands/status' },
              { text: 'tose logs', link: '/vi/commands/logs' },
              { text: 'tose down', link: '/vi/commands/down' }
            ]
          },
          {
            text: 'Cấu hình',
            items: [
              { text: 'File cấu hình', link: '/vi/guide/configuration' },
              { text: 'Biến môi trường', link: '/vi/guide/environment' },
              { text: 'Tích hợp Git', link: '/vi/guide/git' }
            ]
          },
          {
            text: 'Kiến trúc',
            items: [
              { text: 'Cấu trúc dự án', link: '/vi/architecture/structure' },
              { text: 'API Client', link: '/vi/architecture/api-client' },
              { text: 'Luồng hoạt động', link: '/vi/architecture/workflow' }
            ]
          },
          {
            text: 'Tài liệu API',
            items: [
              { text: 'REST API', link: '/vi/api/reference' },
              { text: 'Xác thực', link: '/vi/api/authentication' },
              { text: 'Endpoints', link: '/vi/api/endpoints' }
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
