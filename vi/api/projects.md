# API dự án

Các endpoint để đổi, restart và xóa dự án, cùng quản lý kết nối Git. Tạo và liệt kê dự án, deploy và đọc log nằm trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml) phục vụ tại `GET /api/openapi.yaml`; trang này mô tả các luồng quanh chúng.

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/projects/{project_slug}` và dùng cùng cách xác thực với phần còn lại của API; xem [Xác thực](/vi/api/authentication). Mọi endpoint ở trang này cần vai trò `admin` hoặc `owner` của workspace.

## Cập nhật dự án {#update}

```http
PUT /api/workspaces/{slug}/projects/{project_slug}
```

Cập nhật một phần: chỉ gửi các trường bạn muốn đổi.

| Trường | Kiểu | Mô tả |
|-------|------|-------------|
| `name` | string | Tên hiển thị. Giá trị trống bị bỏ qua |
| `slug` | string | Slug mới: 3-60 chữ thường, số và dấu gạch ngang, duy nhất trong workspace |
| `framework` | string \| null | Nhãn framework |
| `status` | string | `active`, `paused` hoặc `archived` |
| `server_id` | string | Server deploy. Phải thuộc workspace |
| `registry_id` | string | Container registry |
| `port` | integer | Cổng container. `0` trở xuống bị bỏ qua |
| `replicas` | integer | Số replica. `0` trở xuống bị bỏ qua |
| `cpu` | string | Giới hạn CPU theo core, ví dụ `0.5`. Giá trị trống bị bỏ qua |
| `ram` | string | Giới hạn bộ nhớ theo GB, ví dụ `0.5`. Giá trị trống bị bỏ qua |

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/projects/web" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"port": 8080, "cpu": "1", "ram": "1"}'
```

**Phản hồi:** `200` kèm dự án. Khi không có gì đổi, dự án giữ nguyên được trả về.

Thay đổi có hiệu lực ở lần deploy tiếp theo. Dự án có [ổ đĩa bền vững](/vi/guide/persistent-disks) phải giữ một replica và không đổi được `server_id`.

| Mã | Ý nghĩa |
|--------|---------|
| `400` | `status` không hợp lệ, slug sai định dạng, dự án có ổ đĩa bền vững mà bạn tăng `replicas` trên `1` hoặc đổi `server_id`, hoặc server không hợp lệ với workspace |
| `409` | Slug đã được dùng trong workspace |

## Giới hạn tiến trình {#process-limit}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/status
```

Phản hồi trạng thái có đối tượng `resources` chứa giới hạn CPU và bộ nhớ của dự án. Khi bên vận hành đã khai báo giới hạn tiến trình (PID) theo Pod, phản hồi còn có `resources.pids.limit`:

```json
{ "resources": { "pids": { "limit": 4096 } } }
```

- **Theo Pod, dùng chung.** Con số là một ngân sách cho cả Pod: container của dự án và mọi sidecar cùng tính vào đó. Đây không phải cài đặt theo từng container hay từng dự án.
- **Là khai báo, không phải số đo.** Giá trị do bên vận hành hệ thống TOSE cấu hình (`PROJECT_POD_PIDS_LIMIT`) sau khi đã xác nhận cấu hình trên node. TOSE không đọc lại giá trị từ node, nên có thể lỗi thời nếu node thay đổi.
- **Vắng mặt nghĩa là chưa biết.** Trường chỉ xuất hiện khi bên vận hành đã cấu hình một giá trị được xác nhận. Không có đối tượng `pids` không có nghĩa là không giới hạn; nó nghĩa là TOSE không biết giới hạn.
- **Chỉ để báo cáo.** Trường này không đặt hay thực thi giới hạn, và không có lệnh API nào thay đổi nó. Việc thực thi là cấu hình kubelet ở cấp node (`podPidsLimit`), nằm ngoài API này.

## Restart dự án {#restart}

```http
POST /api/workspaces/{slug}/projects/{project_slug}/restart
```

Kích hoạt rolling restart của deployment đang chạy mà không build image mới. Lệnh trả về khi yêu cầu restart được ghi nhận, không phải khi pod mới sẵn sàng; hãy poll trạng thái dự án để biết khi nào chạy lại.

```json
{ "success": true, "message": "Project restarting", "restarted_pods": 1 }
```

`restarted_pods` là số replica của deployment đã restart. Dự án chưa được gán server trả `400`, dự án chưa từng deploy trả `404`.

## Xóa dự án {#delete}

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}
```

::: danger Không thể hoàn tác
Xóa dự án sẽ xóa container build đang chạy, tài nguyên Kubernetes, bản ghi DNS của domain riêng, log và **ổ đĩa bền vững cùng toàn bộ dữ liệu**. Hãy sao lưu thứ bạn cần trước.
:::

Dự án, deployment, biến môi trường, domain, uptime monitor và kết nối Git bị xóa mềm nên không còn xuất hiện trong API. Bản ghi usage được giữ lại cho lịch sử thanh toán.

**Phản hồi:** `200` kèm `{ "message": "..." }`. `502` nghĩa là không xóa được ổ đĩa bền vững: hãy gọi lại.

## Kết nối Git {#git-connection}

Kết nối repository GitHub để mỗi lần push có thể deploy. Workspace cần có GitHub App installation trước; xem [API GitHub](/vi/api/github). Quy trình được mô tả ở [Tích hợp Git](/vi/guide/git).

### Kết nối {#connect}

```http
POST /api/workspaces/{slug}/projects/{project_slug}/git
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------------|
| `repo_full_name` | string | có | Repository dạng `owner/repo` |
| `branch` | string | không | Branch theo dõi. Mặc định `main` |
| `installation_id` | integer | không | GitHub App installation đã gắn vào workspace. Khi bỏ trống, dùng installation duy nhất của workspace hoặc tìm installation truy cập được repository |
| `auto_deploy` | boolean | không | Deploy mỗi lần push. Mặc định `true` |

```bash
curl -X POST "https://api.tose.sh/api/workspaces/$WS/projects/web/git" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"repo_full_name": "acme/web", "branch": "main"}'
```

**Phản hồi:** `201` kèm kết nối.

```json
{
  "id": "…",
  "project_id": "…",
  "provider": "github",
  "repo_full_name": "acme/web",
  "branch": "main",
  "installation_id": 12345678,
  "webhook_id": 987654,
  "auto_deploy": true,
  "created_at": "2026-11-02T07:00:00Z",
  "updated_at": "2026-11-02T07:00:00Z"
}
```

Lệnh tạo webhook push. Nếu không tạo được webhook, kết nối vẫn được lưu và `webhook_id` là `null`. Khi dự án có server, lần deploy đầu tiên được xếp hàng chạy nền, nhưng chỉ khi người gọi có `deployments:execute`. Chỉ có `projects:write` thì kết nối được tạo với `auto_deploy` tắt và không có lần deploy nào được xếp hàng. Xem [Scope và tự động triển khai](/vi/api/authentication#scopes-and-automatic-deploys).

| Mã | Ý nghĩa |
|--------|---------|
| `400` | Thiếu `repo_full_name` hoặc không phải `owner/repo`, repository không truy cập được qua installation, branch không tồn tại, hoặc không installation nào đã gắn truy cập được repository |
| `403` | `installation_id` chưa được gắn vào workspace này |
| `409` | Dự án đã có kết nối Git |
| `503` | GitHub App chưa được cấu hình trên hệ thống này |

### Cập nhật {#update-git}

```http
PUT /api/workspaces/{slug}/projects/{project_slug}/git
```

Gửi `branch` và/hoặc `auto_deploy`. Trường bỏ trống giữ nguyên. Branch mới được kiểm tra với repository. **Phản hồi:** `200` kèm kết nối.

### Ngắt kết nối {#disconnect}

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}/git
```

Gỡ kết nối và xóa webhook GitHub của nó, trừ khi dự án khác vẫn dùng webhook đó. Các deployment hiện có tiếp tục chạy. **Phản hồi:** `200` kèm `{ "message": "..." }`.

## Liên quan

- [Tích hợp Git](/vi/guide/git)
- [API GitHub](/vi/api/github)
- [Ổ đĩa bền vững](/vi/guide/persistent-disks)
