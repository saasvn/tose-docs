# API gợi ý CI

Các endpoint để liệt kê gợi ý tối ưu mà TOSE rút ra cho một pipeline CI, và để chấp nhận hoặc bỏ qua một gợi ý. Gợi ý đến từ [chọn job CI theo phạm vi ảnh hưởng](/vi/guide/ci-impact-selection) và chỉ tồn tại khi tính năng đó được bật trên server. Schema request và response đầy đủ (`CIImpactSuggestion`, `CIImpactSuggestionDecision`) nằm trong [spec OpenAPI](https://api.tose.sh/api/openapi.yaml).

Mọi đường dẫn nằm dưới `/api/workspaces/{slug}/ci`.

| Phương thức và đường dẫn | Ai dùng được | Mục đích |
|--------------------------|--------------|----------|
| `GET /pipelines/{pipeline_id}/suggestions` | Mọi thành viên, hoặc API key có `ci:read` | Liệt kê gợi ý |
| `POST /suggestions/{suggestion_id}/accept` | Owner hoặc admin workspace, đã đăng nhập | Ghi nhận chấp nhận |
| `POST /suggestions/{suggestion_id}/dismiss` | Owner hoặc admin workspace, đã đăng nhập | Ghi nhận bỏ qua |

## Liệt kê gợi ý

```http
GET /api/workspaces/{slug}/ci/pipelines/{pipeline_id}/suggestions?status=open
```

Trả về các gợi ý của pipeline, mới nhất trước, tối đa 100. `status` là tùy chọn và là `open`, `accepted` hoặc `dismissed`.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/pipelines/$PIPELINE/suggestions?status=open" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Response:** `200` với `{"suggestions": [...]}`. Mỗi gợi ý có:

| Trường | Mô tả |
|--------|-------|
| `id`, `pipeline_id`, `workspace_id` | Định danh |
| `kind` | `add_impact_section`, `add_target_paths`, `fix_graph_miss`, `harden_flaky_job`, `map_job` hoặc `split_job` |
| `job` | Job mà gợi ý nói đến, nếu có |
| `title`, `detail` | Cần đổi gì và vì sao |
| `proposal` | Thay đổi cần làm thủ công, ví dụ một đoạn `.tose/ci.yml` |
| `evidence` | JSON với số liệu và các lần chạy làm căn cứ cho gợi ý |
| `status` | `open`, `accepted` hoặc `dismissed` |
| `decided_by`, `decided_at`, `note` | Ai quyết định (`user:<id>`), lúc nào, và ghi chú tùy chọn |

Gợi ý đang mở được làm mới bằng chứng mỗi giờ. Gợi ý đã quyết định không bao giờ được nêu lại.

## Chấp nhận hoặc bỏ qua một gợi ý

```http
POST /api/workspaces/{slug}/ci/suggestions/{suggestion_id}/accept
POST /api/workspaces/{slug}/ci/suggestions/{suggestion_id}/dismiss
```

Body là tùy chọn:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `note` | string | Lý do lưu cùng quyết định, tối đa 2000 ký tự. Không nhận trường nào khác |

```bash
curl -X POST "https://api.tose.sh/api/workspaces/$WS/ci/suggestions/$ID/accept" \
  -H "Cookie: $SESSION_COOKIE" -H "Content-Type: application/json" \
  -d '{"note": "Sẽ thêm target trong #482"}'
```

**Response:** `200` với `{"suggestion": {...}}`.

Một quyết định **chỉ ghi nhận việc phê duyệt để một người áp dụng trong repository, và không thay đổi gì khác.** TOSE chỉ có quyền đọc repository và không bao giờ sửa `.tose/ci.yml` hay pipeline. Sau khi chấp nhận, hãy tự thực hiện thay đổi được đề xuất và mở pull request.

### Chỉ dùng phiên đăng nhập

Quyết định là ngoại lệ của nguyên tắc agent là người dùng hạng nhất của API. Hai route này cần **owner hoặc admin đã đăng nhập** (phiên dashboard hoặc CLI). API key và ứng dụng đã kết nối bị từ chối dù có scope nào, vì gợi ý tồn tại để một người phê duyệt. Audit action là `ci.suggestion.decide`.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `400` | Body có trường khác `note`, hoặc ghi chú quá dài |
| `401` | Chưa đăng nhập |
| `403` | Không phải owner hoặc admin, hoặc người gọi là API key hay ứng dụng đã kết nối |
| `404` | Workspace này không có gợi ý đó |
| `409` | Gợi ý đã được quyết định (`already_decided`) |

Xem [Mã lỗi](/vi/api/errors) về định dạng lỗi và [API key & Scope](/vi/api/api-keys) về cách hoạt động của scope.
