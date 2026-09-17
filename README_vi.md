<div align="center">

<a href="https://github.com/zeroven0205-spec/"><img src="/.github/imgs/logo.svg" width="120" height="120" alt="gptGO logo"></a>

# gptGO

<p align="center">
  <a href="./README_en.md">English</a> |
  <a href="./README.md">简体中文</a> |
  <a href="./README_id.md">Bahasa Indonesia</a> |
  <a href="./README_th.md">ไทย</a> |
  <a href="./README_vi.md">Tiếng Việt</a> |
  <a href="./README_ja.md">日本語</a>
</p>

gptGO là nền tảng xây dựng AI Agent cung cấp khả năng sẵn sàng sử dụng cho xử lý dữ liệu và gọi mô hình. Ngoài ra, bạn có thể điều phối workflow thông qua trực quan hóa Flow để đạt được các kịch bản ứng dụng phức tạp!

</div>

<p align="center">
  <a href="https://github.com/zeroven0205-spec/">
    <img height="21" src="https://img.shields.io/badge/Tài_Liệu-7d09f1?style=flat-square" alt="document">
  </a>
  <a href="https://github.com/zeroven0205-spec/">
    <img height="21" src="https://img.shields.io/badge/Phát_Triển_Local-%23d4eaf7?style=flat-square&logo=xcode&logoColor=7d09f1" alt="development">
  </a>
  <a href="#-dự-án--liên-kết-của-chúng-tôi">
    <img height="21" src="https://img.shields.io/badge/Dự_Án_Liên_Quan-7d09f1?style=flat-square" alt="project">
  </a>
</p>

## Bắt Đầu Nhanh

Bạn có thể khởi động gptGO nhanh chóng bằng Docker. Chạy lệnh sau trong terminal và làm theo hướng dẫn để tải cấu hình.

```bash
# Chạy lệnh để tải file cấu hình
# Xem dự án GitHub gptGO để biết cấu hình triển khai
# Khởi động dịch vụ
docker compose up -d
```

Sau khi khởi động hoàn tất, bạn có thể truy cập gptGO tại `http://localhost:3000`. Tài khoản mặc định là `root` và mật khẩu là `1234`.

Nếu bạn gặp vấn đề, bạn có thể [xem hướng dẫn triển khai Docker đầy đủ](https://github.com/zeroven0205-spec/)

## 🛸 Cách Sử Dụng

- **Phiên Bản Đám Mây**  
  Nếu không cần triển khai riêng, hãy xem các tùy chọn triển khai tại [dự án gptGO trên GitHub](https://github.com/zeroven0205-spec/).

- **Phiên Bản Tự Host Cộng Đồng**  
  Bạn có thể triển khai nhanh chóng bằng [Docker](https://github.com/zeroven0205-spec/) hoặc sử dụng [Sealos Cloud](https://github.com/zeroven0205-spec/) để triển khai gptGO bằng một cú nhấp chuột.

- **Phiên Bản Thương Mại**  
  Nếu bạn cần các tính năng đầy đủ hơn hoặc hỗ trợ dịch vụ chuyên sâu, bạn có thể chọn [Phiên Bản Thương Mại](https://github.com/zeroven0205-spec/). Ngoài việc cung cấp phần mềm đầy đủ, chúng tôi còn cung cấp hướng dẫn triển khai cho các kịch bản cụ thể. Bạn có thể gửi [tư vấn thương mại](https://github.com/zeroven0205-spec/).

## 💡 Tính Năng Cốt Lõi

|                                    |                                    |
| ---------------------------------- | ---------------------------------- |
| ![Demo](./.github/imgs/intro1.png) | ![Demo](./.github/imgs/intro2.jpg) |
| ![Demo](./.github/imgs/intro3.png) | ![Demo](./.github/imgs/intro4.png) |

`1` Khả Năng Điều Phối Ứng Dụng
   - [x] Điều phối Agent Skill.
   - [x] Workflow hội thoại, workflow plugin, bao gồm các node RPA cơ bản.
   - [x] Tương tác người dùng
   - [x] MCP hai chiều
   - [ ] Tạo workflow tự động

`2` Khả Năng Gỡ Lỗi Ứng Dụng
   - [x] Kiểm tra tìm kiếm điểm đơn trong cơ sở kiến thức
   - [x] Phản hồi tham chiếu trong hội thoại với khả năng chỉnh sửa và xóa
   - [x] Nhật ký chuỗi gọi đầy đủ
   - [x] Đánh giá ứng dụng
   - [ ] Chế độ debug DeBug điều phối nâng cao
   - [ ] Nhật ký node ứng dụng

`3` Khả Năng Cơ Sở Kiến Thức
   - [x] Tái sử dụng và kết hợp nhiều cơ sở dữ liệu
   - [x] Sửa đổi và xóa bản ghi chunk
   - [x] Hỗ trợ nhập liệu thủ công, phân đoạn trực tiếp, nhập QA tách
   - [x] Hỗ trợ txt, md, html, pdf, docx, pptx, csv, xlsx (thêm qua PR), hỗ trợ đọc URL và nhập hàng loạt CSV
   - [x] Tìm kiếm kết hợp & xếp hạng lại
   - [x] Cơ sở kiến thức API
   - [ ] 

`4` Khả Năng Plugin
   - [x] Hot update tool hệ thống
   - [ ] Hot update module RAG
   - [ ] Hot update Agent-loop
   - [ ] Plugin do AI tạo theo thời gian thực

`5` Khả Năng Vận Hành
   - [x] Chia sẻ không cần đăng nhập
   - [x] Nhúng Iframe một cú nhấp chuột
   - [x] Xem lại nhật ký hội thoại tập trung với chú thích dữ liệu
   - [x] Nhật ký vận hành ứng dụng

<a href="#readme">
    <img src="https://img.shields.io/badge/-Về_Đầu_Trang-7d09f1.svg" alt="#" align="right">
</a>

## 💪 Dự Án & Liên Kết Của Chúng Tôi

- [Bắt Đầu Phát Triển Địa Phương](https://github.com/zeroven0205-spec/)
- [Tài Liệu OpenAPI](https://github.com/zeroven0205-spec/)
- [gptGO-plugin](https://github.com/zeroven0205-spec/)
- [AI Proxy: Dịch Vụ Cân Bằng Tải Tổng Hợp Mô Hình](https://github.com/labring/aiproxy)
- [Sealos: Triển Khai Nhanh Ứng Dụng Cụm](https://github.com/labring/sealos)

<a href="#readme">
    <img src="https://img.shields.io/badge/-Về_Đầu_Trang-7d09f1.svg" alt="#" align="right">
</a>

## 🌿 Hệ Sinh Thái Bên Thứ Ba

- [AI Proxy: Dịch Vụ Tổng Hợp Mô Hình Lớn](https://github.com/labring/aiproxy)
- [SiliconCloud - Nền Tảng Trải Nghiệm Mô Hình Nguồn Mở Trực Tuyến](https://cloud.siliconflow.cn/i/TR9Ym0c4)

<a href="#readme">
    <img src="https://img.shields.io/badge/-Về_Đầu_Trang-7d09f1.svg" alt="#" align="right">
</a>

## 🏘️ Cộng Đồng

Tham gia nhóm Feishu của chúng tôi:

<a href="#readme">
    <img src="https://img.shields.io/badge/-Về_Đầu_Trang-7d09f1.svg" alt="#" align="right">
</a>

## 🤝 Đóng Góp

Chúng tôi rất hoan nghênh đóng góp dưới mọi hình thức. Nếu bạn quan tâm đến việc đóng góp mã, hãy xem [Issues GitHub](https://github.com/zeroven0205-spec/) của chúng tôi và cho chúng tôi thấy ý tưởng tuyệt vời của bạn!



<a href="#readme">
    <img src="https://img.shields.io/badge/-Về_Đầu_Trang-7d09f1.svg" alt="#" align="right">
</a>

## Giấy Phép

Kho này tuân thủ [Open Source License](./LICENSE).

1. Cho phép sử dụng thương mại như dịch vụ backend, nhưng không cho phép cung cấp dịch vụ SaaS.
2. Bất kỳ dịch vụ thương mại nào không có giấy phép thương mại phải giữ lại thông tin bản quyền liên quan.
3. Xem [Open Source License](./LICENSE) để biết đầy đủ chi tiết.
4. Liên hệ: Dennis@sealos.io, [Xem Giá Thương Mại](https://github.com/zeroven0205-spec/)
