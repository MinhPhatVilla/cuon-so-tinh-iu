# Cuốn Sổ tình iu

Website sổ lưu niệm riêng cho hai người. Mã nguồn dùng Next.js App Router + TypeScript; bản chạy trên Sites dùng Vinext để xuất bản lên Cloudflare Workers.

## Trạng thái

**Phần 9/10 đã viết:** giao diện responsive và PWA; hai tài khoản riêng; album ảnh, lịch tháng, ngày ngẫu nhiên, bản đồ ký ức, khu vườn quà, thư tương lai và 1.000 tổ hợp hiệu ứng. Cần kết nối Supabase để bật và kiểm thử với hai tài khoản thật trên điện thoại và máy tính.

## Chạy cục bộ

Yêu cầu Node.js 22.13 trở lên.

```bash
npm ci
npm run dev
```

Mở URL mà máy chủ in ra. Kiểm tra kiểu dữ liệu bằng `npx tsc --noEmit`, kiểm tra mã bằng `npm run lint`, kiểm tra bộ chọn hiệu ứng bằng `npm run test:effects` và tạo bản dựng bằng `npm run build`.

## Bật tài khoản và dữ liệu riêng

1. Tạo dự án Supabase. Chạy lần lượt sáu tệp trong `supabase/migrations/`, từ `20260925000100_couple_access.sql` đến `20260925000600_effect_preferences.sql`, trong SQL Editor của dự án mới. Nếu đã chạy các phần trước, chỉ chạy migration mới hơn chưa áp dụng.
2. Sao chép `.env.example` thành `.env.local`, điền Project URL và **publishable key**. Không đưa service role key vào biến `NEXT_PUBLIC_*`.
3. Trong Supabase Auth, bật email/password và xác nhận email. Đặt Site URL là địa chỉ website; thêm địa chỉ `/auth/confirm` của môi trường thử nghiệm và website thật vào Redirect URLs.
4. Ở mẫu email **Confirm signup**, thay liên kết xác nhận bằng `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` để máy chủ đổi token thành phiên đăng nhập. Xem [hướng dẫn email template của Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).
5. Khởi động lại máy chủ. Tạo tài khoản thứ nhất, xác nhận email, tạo cuốn sổ, tạo lời mời ở Cài đặt, rồi đăng ký/đăng nhập tài khoản thứ hai bằng đúng email được mời.
6. Ở Album, chọn **Thêm kỷ niệm**. Có thể chọn ảnh JPEG/PNG/WebP hoặc HEIC/HEIF dưới 8 MB, tối đa 8 ảnh mỗi kỷ niệm. HEIC/HEIF cần trình duyệt hỗ trợ đọc ảnh; nếu thiết bị không xử lý được, hãy dùng JPEG/PNG/WebP. Tọa độ chỉ được lấy khi bấm **Dùng vị trí hiện tại**; hãy nhập tên địa điểm và kiểm tra trước khi lưu.
7. Ở Lịch, chuyển tháng hoặc chọn ngày để xem ảnh đã đăng và sự kiện. Chọn **Thêm sự kiện** để đặt ngày, giờ, loại, lời ghi chú, lặp hằng năm và số ngày nhắc trước. Lời nhắc hiện trên Trang chính khi đến khoảng ngày đã chọn; chưa có thông báo đẩy hoặc email. Mỗi người chỉ sửa/xóa sự kiện do mình tạo.
8. Ở Trang chính, chọn **Về một ngày bất kỳ** để mở lại ảnh của một ngày đã đăng. Cỗ máy tránh những ngày vừa chọn khi còn ngày khác. Mở trang kỷ niệm để lật ảnh đọc lời nhắn; người đăng ảnh có thể viết/sửa lời nhắn. Người còn lại có thể viết, sửa hoặc xóa góc nhìn của mình trong kỷ niệm đã đăng.
9. Ở Bản đồ, chọn một ghim hoặc địa điểm trong danh sách để xem mọi lần ghé thăm và ảnh liên quan. Nét nối biểu thị thứ tự ngày đã lưu, không phải đường đi thực tế. Trong màn thêm/sửa kỷ niệm, chọn **Chọn trên bản đồ** rồi chạm hoặc kéo ghim; chỉ lưu sau khi kiểm tra tên và bấm **Đăng kỷ niệm** hoặc **Lưu thay đổi**. Nếu muốn tìm theo tên địa danh, điền `GEOAPIFY_API_KEY` trong `.env.local` và khởi động lại máy chủ. Khóa này chỉ dùng ở máy chủ, không đặt trong biến `NEXT_PUBLIC_*`.
10. Ở Khu vườn, chọn hoa, thiệp hoặc sao, viết lời nhắn rồi gửi cho người còn lại. Quà mới và phong bì mới sẽ cập nhật qua Supabase Realtime khi cả hai đang mở trang; trang cũng làm mới khi quay lại hoặc sau khoảng một phút. Viết thư tương lai với ngày mở từ ngày mai trở đi, tối đa 10 năm; có thể thêm một ảnh JPEG/PNG/WebP dưới 8 MB. Trang chỉ hiển thị phong bì và ngày hẹn trước ngày mở; nội dung và ảnh chỉ được trả sau ngày mở theo giờ Việt Nam. Cả hai cần đã vào cùng cuốn sổ mới gửi được.
11. Mở một trang kỷ niệm hoặc Cỗ máy một ngày bất kỳ để xem hiệu ứng được chọn ngẫu nhiên. **Đổi hiệu ứng** chọn kiểu khác và tránh 20 kiểu vừa xem; nút trái tim lưu tối đa 50 kiểu yêu thích, có nút thử lại trong nhóm này. Chọn mức chuyển động ngay cạnh ảnh hoặc ở Cài đặt: theo thiết bị, đầy đủ, giảm chuyển động. Thiết bị bật giảm chuyển động được tôn trọng ở chế độ mặc định; ảnh và chữ vẫn hiện đầy đủ.

Cho đến khi hoàn thành các bước trên, trang đăng nhập hiển thị trạng thái chờ kết nối; các trang riêng sẽ chuyển về trang đăng nhập.

## Cấu trúc chính

- `app/(private)/`: các trang chỉ thành viên cuốn sổ xem được.
- `app/login`, `app/welcome`, `app/join`: tài khoản và ghép đôi.
- `supabase/migrations/`: cấu trúc dữ liệu, RLS, hàm tạo/nhận lời mời và kho ảnh riêng.
- `app/(private)/memories/`, `app/api/memories/`, `app/api/photos/`: tạo/sửa/xóa kỷ niệm, tải và đọc ảnh riêng tư.
- `app/(private)/calendar/`, `app/api/calendar/`, `lib/calendar/`: lịch tháng, sự kiện và lời nhắc trong ứng dụng.
- `app/(private)/time-machine/`, `components/random-day-button.tsx`: quay lại một ngày ngẫu nhiên đã có ảnh.
- `app/(private)/map/`, `components/map-explorer.tsx`, `components/place-picker.tsx`, `lib/map/`: bản đồ ghim, các lần ghé thăm, nét hành trình và chọn vị trí.
- `app/api/places/search/`: tìm địa danh qua Geoapify khi có khóa máy chủ.
- `components/photo-secret.tsx`, `components/perspective-editor.tsx`: lời nhắn sau ảnh và góc nhìn thứ hai.
- `app/(private)/garden/`, `app/api/gifts/`, `app/api/letters/`, `lib/garden/`: quà tặng, phong bì và thư hẹn ngày mở.
- `components/effect-gallery.tsx`, `components/effect-settings.tsx`, `lib/effects/`, `app/api/effects/`: 1.000 tổ hợp, bộ chọn, sở thích riêng và điều khiển chuyển động.
- `components/site-shell.tsx`: điều hướng máy tính và điện thoại.
- `app/globals.css`: màu sắc, bố cục và trạng thái responsive.
- `public/manifest.webmanifest`, `public/icon-*.png`: nền tảng cài lên màn hình chính.
- `../docs/01-product-blueprint.md`: bản thiết kế sản phẩm đã duyệt.
- `../docs/03-access-status.md`: kết quả và giới hạn kiểm thử phần 3.
- `../docs/04-memories-status.md`: kết quả và giới hạn kiểm thử phần 4.
- `../docs/05-calendar-status.md`: kết quả và giới hạn kiểm thử phần 5.
- `../docs/06-memory-magic-status.md`: kết quả và giới hạn kiểm thử phần 6.
- `../docs/07-map-status.md`: kết quả và giới hạn kiểm thử phần 7.
- `../docs/08-garden-status.md`: kết quả và giới hạn kiểm thử phần 8.
- `../docs/09-effects-status.md`: kết quả và giới hạn kiểm thử phần 9.

Ảnh minh họa trên trang chủ là hình giữ chỗ. Không có ảnh cá nhân hay dữ liệu vị trí trong mã nguồn.

Bản đồ nền dùng [OpenFreeMap](https://openfreemap.org/quick_start/) qua MapLibre; khi mở bản đồ, trình duyệt tải dữ liệu bản đồ từ dịch vụ này. Dịch vụ tìm địa danh tùy chọn dùng [Geoapify](https://apidocs.geoapify.com/docs/geocoding/); từ khóa chỉ được gửi khi người dùng bấm **Tìm**. Không dùng máy chủ Nominatim công cộng vì [chính sách sử dụng](https://operations.osmfoundation.org/policies/nominatim/) của họ không phù hợp với cách triển khai này. Ảnh và dữ liệu kỷ niệm vẫn được bảo vệ bởi Supabase theo quyền thành viên.
