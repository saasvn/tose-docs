# Artifact CI, báo cáo run và bản nháp issue

Một job CI có thể giữ lại các tệp nó tạo ra (báo cáo test, tệp coverage, gói log). Mỗi run có một báo cáo có phiên bản, liệt kê mọi job, hash và artifact của chúng, và TOSE có thể soạn bản nháp issue GitHub cho run không đạt. Các endpoint nằm ở [API artifact và báo cáo CI](/vi/api/ci-artifacts).

::: warning Phải bật ở phía server
Artifact tắt cho đến khi operator đặt `CI_ARTIFACT_UPLOAD_URL` thành origin `https://` công khai của API, không có port hay đường dẫn (ví dụ `https://api.tose.sh`). Job có khai báo `artifacts:` tải lên origin này và host của nó được thêm vào danh sách egress của job. Khi `CI_ENABLED=true`, server từ chối khởi động nếu giá trị có dạng khác. Xem [tài liệu tham chiếu CI harness](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#artifacts).
:::

## Khai báo artifact trong `.tose/ci.yml`

```yaml
jobs:
  test:
    artifacts:
      - name: junit.xml
        path: reports/junit.xml
    artifact_retention_days: 14
    steps:
      - run: npm test
```

- `name`: 1 đến 64 chữ cái, chữ số, `.`, `_` hoặc `-`, bắt đầu bằng chữ cái hoặc chữ số, không trùng trong job.
- `path`: đường dẫn sạch nằm dưới thư mục gốc của repository.
- Tối đa 10 artifact mỗi job.
- `artifact_retention_days`: 1 đến 90, mặc định 30.

Tệp được tải lên khi job kết thúc, dù các step đã đạt, thất bại hay hết thời gian. Tệp thiếu, tệp vượt giới hạn dung lượng hoặc tải lên lỗi sẽ được ghi thành dòng `tose-artifact: <name>: ...` trong log của job và không bao giờ làm job thất bại. Job bị dừng ở hạn chót thì không tải gì lên. Pull request từ fork không bao giờ tải artifact lên. Tên bắt đầu bằng `TOSE_ARTIFACT_` được dành riêng nên `env:` không đặt được.

| Giới hạn | Giá trị |
|----------|---------|
| Một artifact | 8 MiB |
| Một lần chạy (attempt) của job | 32 MiB |
| Artifact chưa hết hạn của một workspace | 512 MiB |
| Số lần tải lên cho mỗi tên và attempt | 1 |

Vượt giới hạn thì lần tải lên bị từ chối, không bao giờ bị cắt bớt.

## Che thông tin nhạy cảm và thời hạn lưu

- Artifact văn bản (UTF-8 hợp lệ, không có byte NUL) đi qua cùng cơ chế che credential như log của job. Văn bản đã che mới được lưu (`redaction: redacted`, và `redaction_changed: true` nếu có chỗ bị thay).
- Artifact nhị phân không che được. Nó được lưu nguyên như lúc tải lên và đánh dấu `redaction: unredacted`.
- Khi hết thời hạn lưu, một tiến trình dọn dẹp mỗi giờ xóa nội dung. Bản ghi (tên, kích thước, hash, trạng thái che, hạn) vẫn còn, nên báo cáo vẫn nêu được run đã tạo ra gì. Artifact hết hạn trả về `410`.

## Đọc báo cáo run

Mỗi run có một báo cáo có phiên bản (`schema_version` là `tose.dev/ci-report/v1`). Mở qua REST (`GET /runs/{run_id}/report`) hoặc MCP (`ci_get_report`), với scope `ci:read`.

1. Đọc `verdict`. Nó đóng theo hướng an toàn: chỉ `succeeded` là xanh. Job thất bại, lỗi hoặc bị hủy là `failed`; job đang xếp hàng hoặc đang chạy là `pending`; job bị bỏ qua, cần xem xét hoặc không rõ, run không có job nào, hoặc run bị bỏ qua là `unverified`.
2. Mỗi job có `log_sha256`, là SHA-256 của log đã che mà endpoint log trả về, cùng các artifact và hash của chúng.
3. `report_hash` là SHA-256 của báo cáo được tuần tự hóa với `report_hash` để trống, nên cùng một trạng thái lưu trữ luôn cho cùng một hash.

Báo cáo không chứa script, token, log thô hay cấu hình. Run mà các bản ghi không đủ để lập báo cáo đầy đủ bị từ chối bằng `409` thay vì hiển thị thiếu.

## Xác minh hash nội dung đã lưu

`sha256` của artifact là hash của đúng các byte đã lưu. Tải nội dung về và so sánh:

```bash
curl -sS -D headers.txt -o junit.xml \
  "https://api.tose.sh/api/workspaces/$WS/ci/artifacts/$ARTIFACT_ID/content" \
  -H "X-API-Key: $TOSE_API_KEY"
sha256sum junit.xml            # phải bằng sha256 của artifact
grep -i x-tose-artifact-sha256 headers.txt
```

Server cũng tính lại hash của các byte đã lưu ở mỗi lần tải và từ chối nội dung không khớp bản ghi (`500`, `artifact_integrity`).

## Đọc artifact đã che

- **REST:** `GET /artifacts/{artifact_id}/content` với `ci:read`.
- **MCP:** `ci_list_artifacts` liệt kê artifact của run và `ci_get_artifact` trả về tối đa 64 KiB của artifact đã che. Cả hai cần `ci:read`.

Nội dung artifact là đầu ra của mã đang được test: hãy coi là không đáng tin.

## Tải bản chưa che chỉ dành cho admin đã đăng nhập

Artifact chưa che có thể chứa bí mật mà job đã ghi vào. Nội dung chỉ được phục vụ ở `GET /artifacts/{artifact_id}/unredacted`, cho một người đã đăng nhập dashboard hoặc CLI với vai trò admin hoặc owner. API key và ứng dụng đã kết nối bị từ chối dù có scope nào, và `ci_get_artifact` trả `ARTIFACT_UNREDACTED`, nên agent không bao giờ đọc được thứ không che được.

## Bản nháp issue

Khi `verdict` của run là `failed` hoặc `unverified`, TOSE có thể soạn một issue GitHub: `GET /runs/{run_id}/issue-proposal` hoặc công cụ MCP `ci_propose_issue`, với scope `ci:diagnose`. Run chưa kết thúc hoặc đã đạt trả về `409`.

Bản nháp gồm tiêu đề, nội dung Markdown có bảng job, gợi ý và lý do đã che, cùng bằng chứng nó dẫn (hash báo cáo, hash log của từng job lỗi và hash artifact, dưới dạng đường dẫn API). Đoạn trích log không được đưa vào. Nội dung kết thúc bằng `dedupe_key` trong chú thích HTML: nó giống nhau cho các run của pipeline thất bại cùng job theo cùng cách, nên hãy tìm trong repository trước khi tạo issue trùng.

**Một người sẽ tạo issue.** TOSE không tạo gì trên GitHub và không có đề xuất pull request. Hãy xem lại bản nháp, kiểm tra issue đã có chưa rồi tự tạo. Tạo tự động cần thêm quyền cho GitHub App và một chính sách phê duyệt hiện chưa có.
