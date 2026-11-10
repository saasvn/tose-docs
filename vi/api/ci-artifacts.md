# API artifact và báo cáo CI

Các endpoint để đọc báo cáo có phiên bản của một run, artifact của nó và bản nháp issue. Khái niệm nằm ở [Artifact CI, báo cáo run và bản nháp issue](/vi/guide/ci-artifacts). Schema đầy đủ (`CIRunReport`, `CIArtifact`, `CIIssueProposal`) có trong [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/ci`.

| Method và đường dẫn | Ai | Mục đích |
|---------------------|----|----------|
| `GET /runs/{run_id}/report` | `ci:read` | Báo cáo có phiên bản |
| `GET /runs/{run_id}/artifacts` | `ci:read` | Artifact của run, chỉ metadata |
| `GET /artifacts/{artifact_id}` | `ci:read` | Metadata của một artifact |
| `GET /artifacts/{artifact_id}/content` | `ci:read` | Artifact văn bản đã che, có kiểm tra hash |
| `GET /artifacts/{artifact_id}/unredacted` | Người đăng nhập với vai trò admin hoặc owner | Mọi artifact, kể cả nhị phân |
| `GET /runs/{run_id}/issue-proposal` | `ci:diagnose` | Bản nháp issue GitHub cho run không đạt |

Artifact, run hoặc pipeline của workspace khác trả về `404`, như khi nó không tồn tại. API key gắn với runtime không dùng được route CI nào.

## Lấy báo cáo

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/runs/$RUN/report" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Phản hồi:** `200` với `schema_version` (`tose.dev/ci-report/v1`), `run`, `verdict`, `jobs`, `counts`, `total_running_seconds`, `total_cost_nano_usd` và `report_hash`. `verdict` là `succeeded`, `failed`, `pending` hoặc `unverified`; chỉ `succeeded` là xanh. Mỗi job có `log_sha256` và các artifact của nó. `409` nghĩa là các bản ghi đã lưu không đủ để lập báo cáo đầy đủ.

## Metadata artifact

**Phản hồi:** danh sách của run là `{"artifacts": [...]}`; một artifact là đối tượng `CIArtifact` trần. Mỗi artifact có `id`, `job_id`, `attempt`, `name`, `size_bytes`, `sha256`, `content_type`, `redaction` (`redacted` hoặc `unredacted`), `redaction_changed`, `created_at`, `expires_at` và `expired`.

## Tải nội dung

```bash
curl -OJ "https://api.tose.sh/api/workspaces/$WS/ci/artifacts/$ID/content" \
  -H "X-API-Key: $TOSE_API_KEY"
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| `200` | Tệp đính kèm `text/plain`, kèm `Repr-Digest`, `X-Tose-Artifact-SHA256` và `X-Content-Type-Options: nosniff` |
| `403` `artifact_unredacted` | Artifact là nhị phân và chưa che; dùng route dành cho admin đã đăng nhập |
| `410` | Đã hết thời hạn lưu; chỉ còn bản ghi |
| `500` `artifact_integrity` | Các byte đã lưu không còn khớp hash; không phục vụ gì |

`GET /artifacts/{artifact_id}/unredacted` có cùng các bước kiểm tra và header, phục vụ nội dung nhị phân dạng `application/octet-stream`, và từ chối API key cùng ứng dụng đã kết nối dù có scope nào (policy action `ci.artifact_unredacted`).

## Bản nháp issue

**Phản hồi:** `200` với `kind` (`github_issue`), `repository`, `title`, `body`, `dedupe_key`, `verdict`, `evidence` và `notice`. `409` cho run chưa kết thúc hoặc đã đạt. Lệnh gọi không tạo gì trên GitHub; một người xem lại và tạo issue.

## Công cụ MCP

| Công cụ | Scope |
|---------|-------|
| `ci_get_report`, `ci_list_artifacts`, `ci_get_artifact` | `ci:read` |
| `ci_propose_issue` | `ci:diagnose` |

`ci_get_artifact` trả về tối đa 64 KiB của artifact đã che kèm thông báo rằng nội dung không đáng tin, và từ chối artifact chưa che (`ARTIFACT_UNREDACTED`).

Artifact tắt cho đến khi operator đặt `CI_ARTIFACT_UPLOAD_URL`. Endpoint upload mà job dùng không thuộc API workspace hay hợp đồng OpenAPI công khai.
