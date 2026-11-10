# Nút Deploy on TOSE

Thêm nút **Deploy on TOSE** vào README hoặc website của bạn. Người truy cập bấm nút sẽ vào TOSE và deploy repository GitHub của bạn, hoặc một template của TOSE, vào workspace của chính họ.

Trang này dành cho tác giả thêm nút. Các phần cuối mô tả những gì người truy cập nhìn thấy, để bạn biết trước điều gì sẽ xảy ra.

## Nút này làm gì {#what-it-does}

Nút là một liên kết thông thường tới `https://app.tose.sh/deploy`. Liên kết cho biết cần deploy cái gì: một repository GitHub hoặc một template của TOSE.

- Bấm nút chỉ mở một form. Việc bấm **không bao giờ tạo project, bắt đầu deployment hay tính phí**. Người truy cập luôn tự xem lại form và tự bấm nút xác nhận.
- Liên kết chỉ chứa **tên biến**, không bao giờ chứa giá trị.
- Người truy cập chưa đăng nhập sẽ đăng nhập trước, rồi quay lại đúng liên kết đó.

## Cách nhanh nhất: trang tạo nút {#generator}

Mở trang tạo nút tại [tose.sh/deploy-button](https://tose.sh/deploy-button). Nhập repository hoặc template, điền các trường tuỳ chọn, rồi trang sẽ:

1. kiểm tra từng trường theo các quy tắc trong [bảng tham chiếu liên kết](#link-reference);
2. hiển thị bản xem trước của nút ở dạng sáng và dạng tối;
3. cung cấp đoạn mã Markdown, HTML và widget, mỗi đoạn có nút **Sao chép**.

Dán đoạn mã bạn cần vào README hoặc trang của bạn. Các phần dưới đây giải thích từng đoạn mã và từng tham số, phòng khi bạn muốn tự viết liên kết.

## Đoạn mã để sao chép {#snippets}

Các ví dụ deploy repository `acme/shop` từ branch `main`, đặt tên project là `shop` và yêu cầu hai biến. Hãy thay bằng giá trị của bạn.

Hình ảnh của nút do TOSE phục vụ:

| Hình ảnh | Dùng trên |
|----------|-----------|
| `https://tose.sh/button.svg` | Nền sáng |
| `https://tose.sh/button-dark.svg` | Nền tối |

### Markdown {#snippet-markdown}

Dùng trong README. GitHub hiển thị hình ảnh và biến nó thành liên kết.

```markdown
[![Deploy on TOSE](https://tose.sh/button.svg)](https://app.tose.sh/deploy?repo=https%3A%2F%2Fgithub.com%2Facme%2Fshop&branch=main&name=shop&env=DATABASE_URL%2CSESSION_SECRET)
```

Với nền tối, dùng `https://tose.sh/button-dark.svg` làm hình ảnh.

### HTML {#snippet-html}

Dùng trên website hoặc bất kỳ trang nào chấp nhận HTML.

```html
<a href="https://app.tose.sh/deploy?repo=https%3A%2F%2Fgithub.com%2Facme%2Fshop&amp;branch=main&amp;name=shop&amp;env=DATABASE_URL%2CSESSION_SECRET"><img src="https://tose.sh/button.svg" alt="Deploy on TOSE" height="32"></a>
```

### Widget {#snippet-widget}

Widget là tuỳ chọn. Nó tự vẽ nút cho bạn và chọn bản sáng hoặc tối theo giao diện của người xem.

```html
<script async src="https://tose.sh/deploy-button.js"></script>
<tose-deploy-button repo="https://github.com/acme/shop" branch="main" name="shop" env="DATABASE_URL,SESSION_SECRET"></tose-deploy-button>
```

- Phần tử nhận các thuộc tính giống tham số của liên kết: `repo`, `branch`, `name`, `env`, `template`, `version` và `publisher`. Quy tắc nằm trong [bảng tham chiếu liên kết](#link-reference).
- `theme` là tuỳ chọn. Đặt `theme="light"` hoặc `theme="dark"` để cố định giao diện. Nếu bỏ qua, nút theo chế độ sáng hoặc tối của người xem.
- Nút mở trang deploy trong một tab mới.
- Nếu thiếu thuộc tính hoặc thuộc tính không hợp lệ, nút không được vẽ và console của trình duyệt hiện một cảnh báo.
- Script không chạy trong README của GitHub. Ở đó hãy dùng đoạn mã Markdown.

Với template, dùng `template` thay cho `repo`:

```html
<tose-deploy-button template="dewee"></tose-deploy-button>
```

## Bảng tham chiếu liên kết {#link-reference}

Liên kết deploy có dạng `https://app.tose.sh/deploy?` theo sau là các tham số. **Bắt buộc có đúng một trong hai: `repo` hoặc `template`.**

| Tham số | Áp dụng cho | Quy tắc | Ví dụ |
|---------|-------------|---------|-------|
| `repo` | Repository | `https://github.com/{owner}/{repo}`. Đuôi `.git` hoặc dấu `/` ở cuối bị bỏ qua. Chỉ GitHub, qua `https`, không có thêm đường dẫn, query hay fragment. Owner gồm chữ cái, chữ số và dấu gạch ngang đơn (tối đa 39 ký tự, không có gạch ngang ở đầu hoặc cuối). Tên repository gồm chữ cái, chữ số, `.`, `_` và `-` (tối đa 100 ký tự). | `repo=https://github.com/acme/shop` |
| `branch` | Repository | Tuỳ chọn. Branch được chọn sẵn. Gồm chữ cái, chữ số, `.`, `_`, `-` và `/`, tối đa 255 ký tự. Không được bắt đầu bằng `/`, `-` hoặc `.`, không được kết thúc bằng `/`, `.` hoặc `.lock`, và không được chứa `..`, `//` hay `/.`. | `branch=main` |
| `name` | Repository | Tuỳ chọn. Tên project được điền sẵn. Chữ thường, chữ số và dấu gạch ngang, tối đa 63 ký tự, bắt đầu và kết thúc bằng chữ cái hoặc chữ số. | `name=shop` |
| `env` | Repository | Tuỳ chọn. Danh sách tên biến cách nhau bằng dấu phẩy, được điền sẵn thành các dòng trống. Tên bắt đầu bằng chữ cái hoặc `_`, sau đó là chữ cái, chữ số hoặc `_`, tối đa 128 ký tự. Tối đa 50 tên, không lặp, không có khoảng trắng. **Chỉ tên, không bao giờ có giá trị.** | `env=DATABASE_URL,SESSION_SECRET` |
| `template` | Template | Key của template: chữ thường, chữ số và dấu gạch ngang, tối đa 63 ký tự, bắt đầu và kết thúc bằng chữ cái hoặc chữ số. | `template=dewee` |
| `version` | Template | Tuỳ chọn. Phiên bản template: bắt đầu bằng chữ cái hoặc chữ số, sau đó là chữ cái, chữ số, `.`, `_`, `+` hoặc `-`, tối đa 64 ký tự. Được chuyển cho wizard deploy template. | `version=1.4.0` |
| `publisher` | Template | Tuỳ chọn. Key của publisher, cùng quy tắc với `template`. Được chuyển cho wizard deploy template. | `publisher=acme` |

Các quy tắc khác:

- Liên kết repository chỉ nhận `repo`, `branch`, `name` và `env`. Liên kết template chỉ nhận `template`, `version` và `publisher`.
- Tên tham số phân biệt chữ hoa chữ thường. Mỗi tham số xuất hiện tối đa một lần và không được để trống.
- **Mọi tham số khác đều làm liên kết không hợp lệ**, kể cả tham số theo dõi như `utm_source`. Đừng thêm chúng.
- Khi tự viết liên kết, hãy mã hoá phần trăm các giá trị (`:` thành `%3A`, `/` thành `%2F`, `,` thành `%2C`). Trang tạo nút làm việc này giúp bạn.
- Key template thuộc danh mục 1-click, như `dewee` hoặc `goclaw`, sẽ mở form deploy của danh mục khi liên kết không có `publisher`. Template khác, hoặc bất kỳ liên kết nào có `publisher`, mở wizard deploy template.

## Người truy cập thấy gì {#visitor-flow}

1. **Liên kết được kiểm tra.** Nếu vi phạm quy tắc nào, người truy cập thấy một [trang lỗi](#troubleshooting) nêu từng vấn đề, và không có gì khác xảy ra.
2. **Đăng nhập.** Người chưa đăng nhập được chuyển tới trang đăng nhập, rồi quay lại đúng liên kết đó.
3. **Chọn workspace.** Nếu chỉ có một workspace, người truy cập đi thẳng tiếp. Nếu có nhiều, họ chọn một. Nếu chưa có workspace nào, họ được yêu cầu tạo workspace đầu tiên, rồi tiếp tục.
4. **Liên kết repository:** form tạo project mới mở ra với repository, branch, tên project và tên biến đã được điền sẵn. Một banner cho biết form đến từ liên kết Deploy on TOSE. Các dòng biến để trống, nên người truy cập tự nhập giá trị. Nếu branch không tồn tại trong repository, một ghi chú báo như vậy và branch mặc định được chọn.
   **Liên kết template:** việc deploy template mở ra với template, phiên bản và publisher lấy từ liên kết.
5. **Xem lại và deploy.** Người truy cập kiểm tra từng trường rồi bấm nút tạo project (**Create Project** trên form tạo project mới). Cho đến lúc đó, chưa có gì được tạo và chưa có gì bị tính phí.

### Quyền truy cập repository {#repository-access}

TOSE đọc repository thông qua TOSE GitHub App được cài trên tài khoản GitHub mà người truy cập đã kết nối với workspace. Form tìm repository trong liên kết trong số các repository TOSE đọc được, rồi tìm bản fork của người truy cập từ repository đó:

- **Chính repository đó.** Nếu TOSE đọc được repository trong liên kết, chẳng hạn vì người truy cập là chủ sở hữu, repository được chọn sẵn.
- **Bản fork của người truy cập.** Nếu không, TOSE hỏi GitHub xem repository nào trong số các repository đọc được là fork của repository trong liên kết. Bản fork được nhận ra dù mang tên gì. Nếu có một bản, nó được chọn sẵn và một ghi chú nêu đó là bản fork của người truy cập. Nếu có nhiều bản, chúng được đưa ra để chọn và không có gì được chọn sẵn cho đến khi người truy cập chọn.
- **Bản fork TOSE không xác nhận được.** Nếu GitHub không xác nhận được các bản fork, form có thể hỏi "đây có phải bản fork của bạn không?" về những repository là fork và trùng tên với repository trong liên kết. Không có gì được chọn sẵn, và người truy cập tự quyết định.

Khi TOSE không tìm thấy kết quả nào khớp, form giải thích còn thiếu gì và đưa ra ba hành động:

- **Fork on GitHub** mở trang fork của GitHub cho repository trong liên kết, trong một tab mới. Người truy cập fork nó về tài khoản hoặc tổ chức do họ quản lý. TOSE không bao giờ tự fork thay người truy cập.
- **Install or configure the GitHub App** mở GitHub để người truy cập cấp cho TOSE GitHub App quyền truy cập vào tài khoản sở hữu bản fork.
- **Check again** đọc lại các tài khoản GitHub đã kết nối mà không rời khỏi form, rồi tìm lại repository và bản fork một lần nữa.

Việc tìm repository không thay đổi gì: form chỉ được gửi khi người truy cập bấm nút tạo project.

### Chi phí và ví {#cost-and-wallet}

Một lượt bấm không tốn gì. Phí được tính theo quy tắc thông thường khi người truy cập tạo project và deploy, trên ví của workspace họ đã chọn. TOSE từ chối deploy khi số dư ví của workspace đó bằng 0 hoặc âm, và người truy cập phải nạp tiền trước. Xem [Bảng giá](/vi/guide/pricing#when-the-balance-is-zero).

## Repository cần gì {#repository-requirements}

Repository phải là một project TOSE deploy được theo cách thông thường, giống như khi dùng `tose up`. Không cần thêm file manifest nào và không có gì riêng của TOSE phải commit cho nút này. Để biết TOSE build một project như thế nào, xem [Bắt đầu](/vi/guide/getting-started) và [Ví dụ Dockerfile](/vi/guide/dockerfile).

Nếu project cần biến môi trường, hãy liệt kê tên của chúng trong `env`. Khi đó người truy cập thấy một dòng cho mỗi biến và tự điền giá trị. Xem [Biến môi trường](/vi/guide/environment) để biết cách biến hoạt động sau khi deploy.

## Giới hạn {#limits}

- **Chỉ GitHub.** `repo` phải là URL dạng `https://github.com/{owner}/{repo}`. GitLab, Bitbucket và các host khác chưa được hỗ trợ.
- **Người truy cập deploy repository của chính họ hoặc bản fork của họ.** TOSE không build thẳng từ repository của người khác và không fork thay người truy cập. Repository private chỉ được deploy bởi những người có tài khoản GitHub đọc được nó.
- **Chỉ có tên biến.** Liên kết có thể nêu tên biến nhưng không mang được giá trị. **Không bao giờ đặt secret, token hay mật khẩu vào liên kết.** Liên kết là công khai, và nó nằm lại trong lịch sử trình duyệt và trong log.
- **Template phải deploy được theo trạng thái phát hành của nó.** Việc deploy template áp dụng các kiểm tra về phát hành và thư mục, và template không qua được các kiểm tra đó thì không deploy được qua liên kết.

## Xử lý sự cố {#troubleshooting}

Liên kết vi phạm quy tắc sẽ mở trang **Link deploy này không hợp lệ** (HTTP status 400). Trang liệt kê mọi vấn đề cùng lúc, nên bạn sửa được hết trong một lượt. Trang theo ngôn ngữ mà người truy cập đã chọn trong dashboard, tiếng Anh hoặc tiếng Việt. Chưa có gì được deploy, và liên kết không bao giờ chuyển hướng tới nơi khác.

| Thông báo | Nguyên nhân và cách sửa |
|-----------|-------------------------|
| Link cần có tham số repo hoặc template. | Thêm một trong hai. |
| Link có cả repo lẫn template. | Giữ một. Mỗi link deploy một repository hoặc một template, không bao giờ cả hai. |
| "{param}" không phải là tham số của link deploy. | Xoá nó đi. Chỉ bảy tham số trong [bảng tham chiếu liên kết](#link-reference) được phép, tham số theo dõi thì không. |
| "{param}" xuất hiện nhiều hơn một lần. | Chỉ giữ một bản. |
| "{param}" đang để trống. | Điền giá trị hoặc xoá nó. |
| "{param}" chỉ dùng cho link repository (repo=…). | `branch`, `name` và `env` đi cùng `repo`. Xoá nó hoặc chuyển sang liên kết repository. |
| "{param}" chỉ dùng cho link template (template=…). | `version` và `publisher` đi cùng `template`. Xoá nó hoặc chuyển sang liên kết template. |
| "repo" phải là URL repository GitHub. | Dùng `https://github.com/OWNER/REPO`, không có đường dẫn nào khác như `/tree/main`. |
| "branch" không phải là tên branch hợp lệ. | Kiểm tra các ký tự, phần đầu và phần cuối của tên. |
| "name" chỉ gồm chữ thường, chữ số và dấu gạch ngang. | Dùng chữ thường, tối đa 63 ký tự, bắt đầu và kết thúc bằng chữ cái hoặc chữ số. |
| "env" phải là danh sách tên biến cách nhau bằng dấu phẩy. | Dùng tên như `DATABASE_URL,API_KEY`, không có khoảng trắng và không có giá trị. |
| "env" có một tên biến bị lặp lại. | Xoá tên lặp. |
| "env" có nhiều hơn 50 tên biến. | Giữ tối đa 50. |
| "template" phải là key của template. | Dùng chữ thường, chữ số và dấu gạch ngang. |
| "version" không phải là phiên bản template hợp lệ. | Kiểm tra các ký tự. |
| "publisher" phải là key của publisher. | Dùng chữ thường, chữ số và dấu gạch ngang. |

Những điều khác người truy cập có thể gặp:

| Họ thấy | Cần làm |
|---------|---------|
| TOSE chưa thấy được repository. | Làm theo [Quyền truy cập repository](#repository-access): fork hoặc cài GitHub App, rồi chọn **Check again**. |
| Không tải được danh sách workspace. | Tải lại trang. |

Để thử liên kết của bạn, hãy mở nó khi chưa đăng nhập, rồi mở lại sau khi đăng nhập. Kiểm tra form có đến với các giá trị đã điền sẵn hay không, và website chứa README của bạn có tự thêm tham số nào ngoài ý muốn hay không.

## Liên quan {#related}

- [Tích hợp Git](/vi/guide/git) - Kết nối repository để deploy tự động
- [Bắt đầu](/vi/guide/getting-started) - Deploy bằng CLI
- [Biến môi trường](/vi/guide/environment) - Quản lý biến sau khi deploy
- [Bảng giá](/vi/guide/pricing) - Quy tắc về ví và thanh toán
