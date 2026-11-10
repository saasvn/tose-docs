# Chọn job CI theo phạm vi ảnh hưởng

Impact selection cho phép một pull request chỉ chạy những job CI mà diff của nó có thể ảnh hưởng. Khi không chứng minh được một job không bị ảnh hưởng, job đó vẫn chạy. Mọi trường hợp không chắc chắn đều chạy toàn bộ suite và ghi lại lý do.

::: warning Mặc định tắt
Tính năng này tắt trừ khi server TOSE đặt `CI_IMPACT_SELECTION=true` **và** `.tose/ci.yml` của repository có mục `impact:`. Khi cờ tắt, hệ thống không ghi nhận gì và mọi lần chạy đều lên kế hoạch cho tất cả job. Bản thân TOSE CI cũng phải bật riêng (`CI_ENABLED`). Với workspace trên bản hosted, hãy hỏi chủ workspace hoặc đội hỗ trợ TOSE xem tính năng đã bật chưa.
:::

Trang này giải thích hành vi. Để biết đầy đủ tùy chọn, giới hạn và schema chính xác, xem nguồn gốc trong repository của app: [`docs/ci-impact-selection.md`](https://github.com/saasvn/tose-app/blob/master/docs/ci-impact-selection.md) và [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) (`GET /api/openapi.yaml`).

## Cài đặt phía server

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `CI_IMPACT_SELECTION` | `false` | `true` cho phép các lần chạy pull request bỏ qua job không bị ảnh hưởng |
| `CI_IMPACT_REPLAY_PERCENT` | `10` | Tỷ lệ các lần chạy chọn lọc đã xanh được chạy lại đầy đủ, từ 1 đến 100 |

## Mục `impact:`

```yaml
impact:
  graph_version: "2026-11-04"   # bắt buộc; đổi giá trị này sau khi sửa graph
  targets:
    shared: { paths: [pkg/shared] }
    api:    { paths: [internal/, cmd/], depends_on: [shared] }
    web:    { paths: [frontend/], depends_on: [shared] }
  jobs:                          # job -> các target mà job kiểm thử
    test-api: [api]
    test-web: [web]
  full_suite_paths: [scripts/]  # tùy chọn: đổi các đường dẫn này thì chạy mọi job
  extract:                      # tùy chọn: xem "Graph được trích xuất"
    job: impact-graph
    formats: [go]
  coverage: [test-api]          # tùy chọn: xem "Coverage"
```

- Một **target** sở hữu các đường dẫn trong repository và có thể `depends_on` target khác. Thay đổi một target sẽ chọn target đó và mọi target phụ thuộc vào nó.
- Job có trong `jobs` chạy khi một trong các target của nó được chọn. **Job không được liệt kê luôn chạy.** Hãy để lint, quét bảo mật, smoke test và mọi check mà branch protection yêu cầu ra ngoài `jobs`.
- Job mà một job đang chạy `needs` cũng luôn chạy.
- Trường lạ, job hoặc target không tồn tại, vòng phụ thuộc và thiếu `graph_version` đều là lỗi cấu hình.

## Khi nào chạy toàn bộ suite

Chỉ các lần chạy `pull_request` mới được chọn lọc. Planner so sánh commit base và head của pull request, rồi chạy mọi job (kèm lý do) khi, ví dụ:

- sự kiện là push, chạy thủ công hoặc replay, nên mỗi commit trên `master` vẫn chạy tất cả;
- cấu hình không có mục `impact:`, hoặc chính file cấu hình CI bị đổi;
- một file thay đổi không thuộc target nào, hoặc một đường dẫn toàn cục bị đổi (`.github/`, `.tose/`, migration, mã auth, billing hay security, file manifest và lockfile của dependency, `Dockerfile`, `Makefile`, `nx.json`, `turbo.json`, hoặc một mục `full_suite_paths`);
- diff rỗng hoặc quá lớn để GitHub liệt kê (300 file), hoặc GitHub lỗi;
- việc chọn lọc sẽ không chạy job nào;
- một replay trước đó đã phát hiện lỗi chọn sai (miss) với `graph_version` này (xem [Replay và miss](#replay-va-miss));
- đã cấu hình graph trích xuất nhưng không có graph cho commit base (xem bên dưới);
- không đọc được lịch sử job hoặc coverage.

Job không được chọn kết thúc ở trạng thái **skipped**, và Check Run của nó có tiêu đề **Not affected**. Mỗi lần chạy lưu chế độ (`selected`, `selection_fallback_full` hoặc `full`), plan hash, phiên bản graph và lý do.

## Graph được trích xuất

Viết `depends_on` thủ công là chỗ replay miss thường bắt được lỗi. Với `impact.extract`, một job ghi graph workspace của từng commit ở mỗi lần push, và TOSE dùng nó cho các pull request **có base là commit đó**:

```yaml
jobs:
  impact-graph:
    cache: [go]
    egress: [goproxy]
    steps:
      - run: go list -deps -test -json ./... > "$TOSE_CI_IMPACT_GO"
impact:
  graph_version: "2026-11-06"
  extract: { job: impact-graph, formats: [go] }
  targets:
    api:    { paths: [internal/, cmd/] }   # không cần depends_on cho import Go
    shared: { paths: [pkg/shared] }
  jobs:
    test-api: [api]
```

| Định dạng | Bước ghi vào | Lệnh |
|-----------|--------------|------|
| `go` | `$TOSE_CI_IMPACT_GO` | `go list -deps -test -json ./...` |
| `nx` | `$TOSE_CI_IMPACT_NX` | `npx nx graph --file="$TOSE_CI_IMPACT_NX"` |
| `turbo` | `$TOSE_CI_IMPACT_TURBO` | `npx turbo run build --dry=json > "$TOSE_CI_IMPACT_TURBO"` (task có `dependsOn` chứa `^build`) |
| `tose` | `$TOSE_CI_IMPACT_TOSE` | công cụ bất kỳ ghi ra `{"schema":"tose.impact-graph/v1","nodes":[{"name":"a","dir":"libs/a","deps":["b"]}]}` |

`extract.formats` liệt kê từ một đến bốn mục trong `go`, `nx`, `turbo` và `tose`, mỗi mục một lần. Các công cụ workspace khác (Bazel, Gradle, pnpm workspace không dùng Nx hay Turborepo) chưa có adapter; chúng có thể ghi định dạng `tose`.

Cách hoạt động:

- **Chỉ lần chạy push mới tải graph lên.** Pull request, fork, lần chạy thủ công hoặc replay không tải gì lên, và việc tải lên không bao giờ làm job thất bại.
- TOSE coi bản tải lên là dữ liệu không tin cậy: parse, lưu graph đã chuẩn hóa, và từ chối cả file nếu nó quá lớn, sai định dạng, trỏ ra ngoài checkout, nêu một dependency mà graph không liệt kê, hoặc có package Go bị lỗi. Graph đã lưu bị xóa sau 30 ngày.
- Pull request dùng graph mới nhất của mỗi định dạng do lần chạy push của **commit base** tải lên. Vì vậy graph quyết định luôn đến từ mã đã nằm trên một nhánh, không bao giờ từ chính pull request.
- **Chạy toàn bộ suite khi dự phòng:** nếu một định dạng đã cấu hình không có graph hợp lệ cho commit base (chưa tải lên hoặc bản tải lên bị từ chối), pull request chạy toàn bộ suite và lý do nêu tên định dạng và commit.
- Graph chỉ **thêm** target. Mọi thứ mục `impact:` chọn vẫn được chọn, mỗi file thay đổi vẫn cần một target, và mọi quy tắc chạy toàn bộ suite vẫn áp dụng.
- Tải lên cần `CI_IMPACT_SELECTION=true` và bucket cache CI trên server. Việc tải lên không bị tính phí.

## Coverage và lịch sử flaky

Hai tín hiệu nữa có thể thêm job vào một lần chọn. Cả hai đều không bao giờ bỏ qua job.

**Coverage.** Job có trong `impact.coverage` nhận `$TOSE_CI_COVERAGE`. Một bước ghi cover profile của Go (`go test -coverprofile="$TOSE_CI_COVERAGE" -coverpkg=./... ./...`) hoặc tracefile lcov vào đó, và các lần chạy push tải nó lên. Khi một pull request đổi file mà test của job bao phủ, job đó chạy dù target của nó không được chọn, với lý do `coverage: its tests cover changed <file>`. File mà coverage không liệt kê không chứng minh được gì, vì test đọc file dữ liệu và khởi chạy tiến trình con. Coverage của Go gọi file theo import path nên cần graph `go` để ánh xạ về repository; không có graph, coverage Go không thêm gì.

**Job flaky.** Job vừa pass vừa fail trên cùng một commit (cùng sự kiện và commit base) trong 30 ngày qua là **flaky**. Lần pass của job flaky không chứng minh được gì, nên việc chọn lọc không bao giờ bỏ qua nó: nó chạy với lý do `flaky: passed and failed on <commit>, so it is never skipped`. Lịch sử được lưu theo từng job; kết quả test bên trong job không được đọc.

## Replay và miss {#replay-va-miss}

Để bắt lỗi chọn sai, TOSE chạy lại đầy đủ một mẫu các lần chạy chọn lọc đã xanh, cộng với pipeline nào đã bỏ qua job mà 24 giờ chưa có replay. Replay là một lần chạy bình thường: tính phí vào ví workspace và đăng Check Run trên cùng commit.

Nếu một job mà việc chọn lọc đã bỏ qua lại fail trong replay, kết quả là **miss**. Miss tắt việc chọn lọc cho pipeline và `graph_version` đó: mọi pull request sau đều chạy toàn bộ suite và nêu lý do, cho đến khi bạn sửa graph và đổi `graph_version`.

## Gợi ý tối ưu

Mỗi giờ TOSE rút ra các gợi ý từ 30 ngày chạy gần nhất của mỗi pipeline:

| Loại | Khi nào |
|------|---------|
| `add_impact_section` | 5 lần chạy pull request trở lên chạy toàn bộ suite vì chưa có mục `impact:` |
| `add_target_paths` | 3 lần chạy trở lên chạy toàn bộ suite vì file thay đổi trong cùng thư mục không thuộc target nào |
| `fix_graph_miss` | một replay thấy job bị bỏ qua lại fail; đề xuất dependency còn thiếu và, nếu chưa có `extract`, việc trích xuất graph |
| `harden_flaky_job` | job vừa pass vừa fail trên cùng một commit; yêu cầu làm test ổn định, không bao giờ yêu cầu xóa test |
| `map_job` | job chưa được ánh xạ chạy từ 5 lần, trung bình từ 5 phút trở lên |
| `split_job` | job đã ánh xạ có từ 2 target trở lên chạy trong từ 80% của ít nhất 5 lần chạy chọn lọc, trung bình từ 10 phút trở lên |

Một gợi ý có tiêu đề, chi tiết, đoạn `.tose/ci.yml` đề xuất và bằng chứng. **Gợi ý không bao giờ tự thay đổi pipeline của bạn.** TOSE chỉ có quyền đọc repository, nên một người sẽ tự áp dụng thay đổi trong repository. Sau đó owner hoặc admin của workspace **chấp nhận** gợi ý (ghi nhận rằng họ sẽ thực hiện thay đổi) hoặc **bỏ qua** nó. Gợi ý đã quyết định sẽ không được nêu lại.

Chấp nhận và bỏ qua đòi hỏi owner hoặc admin đã đăng nhập: API key và ứng dụng đã kết nối chỉ đọc được gợi ý, không bao giờ quyết định được. Xem [API gợi ý CI](/vi/api/ci-suggestions).

## Chưa có

- Lịch sử đồng thay đổi (các file thường đổi cùng nhau) chưa được dùng.
- Gợi ý chưa có trang dashboard hay công cụ MCP; hiện chỉ dùng được qua API.
- Cache dependency không bị chọn lọc thay đổi: vẫn khóa theo workspace và pipeline, và fork không bao giờ chạy.
