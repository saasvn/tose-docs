# Apps: view ngay trong agent

Host hỗ trợ MCP Apps (`io.modelcontextprotocol/ui`) hiển thị một view tương tác bên cạnh một số kết quả tool. Host không hỗ trợ sẽ bỏ qua view và hiển thị kết quả thuần, vốn mang cùng dữ liệu.

## Các view

| View | Hiển thị cho | Nội dung |
|------|--------------|----------|
| Deployment timeline | `get_deployment_status` | Các giai đoạn của deployment, làm mới mỗi 5 giây đến khi kết thúc. Các deployment gần đây, và build log khi cần. |
| Deployment plan | `deploy_project`, `rollback_deployment` | Plan, chi phí ước tính và nút mở trang duyệt. Sau khi bạn duyệt thì hiển thị trạng thái deployment. |
| Diagnostics | `inspect_deployment` | Chi tiết deployment, lỗi đã được che thông tin nhạy cảm, nguyên nhân có thể kèm bằng chứng cho từng nguyên nhân, và bước tiếp theo cho deployment thất bại. |

## Bằng chứng của chẩn đoán

Với deployment thất bại, `inspect_deployment` trả `diagnosis`. Các nguyên nhân có thể là giả thuyết, không phải bằng chứng chắc chắn, và mỗi nguyên nhân nêu rõ bằng chứng nó dựa vào:

- `findings` liệt kê từng `cause` kèm `evidence_ids`.
- `evidence` liệt kê các quan sát: `id`, `source` (`deployment`, `deployment_error`, `runtime_log`, `ops_event` hoặc `resource_metric`), `observed_at` và `summary` chung.

Nội dung log và event thô không bao giờ được chép vào chẩn đoán. Để đọc nguồn của một id, dùng gợi ý trong `summary`: mục `runtime_log` nêu lệnh `read_logs` cần gọi (chỉ log runtime trong 24 giờ gần nhất, dòng được trích có dấu `#<entry-id>`), còn mục `ops_event` nêu incident để dùng với `inspect_incident`. Metric của pod chỉ là bối cảnh, không chứng minh nguyên nhân. Rollback chỉ được đề xuất để bạn duyệt.

## Host nào hỗ trợ

Hỗ trợ tùy theo host và phiên bản. [Ma trận client](https://github.com/saasvn/tose-app/blob/master/docs/mcp-client-matrix.md) trong tose-app ghi lại những gì mỗi nhà cung cấp tuyên bố. Chưa host nào được kiểm chứng với TOSE, nên hãy coi Apps là phần cộng thêm, đừng để quy trình của bạn phụ thuộc vào nó.

## Chi phí trong plan chỉ là ước tính

Chi phí hiển thị trong plan là **giá niêm yết** ở mức tiêu chuẩn (như nhau cho mọi workspace), nhân với CPU, RAM và số replica đã cấu hình. Chi phí được hiển thị bằng cent Mỹ mỗi giờ và đô la Mỹ mỗi 30 ngày (720 giờ). **Đây chỉ là ước tính.** Phí thật được đo theo giờ. Xem [bảng giá](/vi/guide/pricing).

## View làm được và không làm được gì

- View được tích hợp sẵn trong server, không tải tài nguyên bên ngoài và chỉ hiển thị dữ liệu dạng văn bản.
- View truy cập TOSE thông qua host, với đúng scope của kết nối, và chỉ gọi các tool đọc.
- Việc duyệt vẫn diễn ra trên trang duyệt của TOSE. View plan chỉ mở link đó, không bao giờ thấy hay gửi approval token.
