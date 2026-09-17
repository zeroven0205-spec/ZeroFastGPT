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

gptGO adalah platform pembangunan AI Agent yang menyediakan kemampuan siap pakai untuk pemrosesan data dan pemanggilan model. Selain itu, Anda dapat mengorkestrasikan workflow melalui visualisasi Flow untuk mencapai skenario aplikasi yang kompleks!

</div>

<p align="center">
  <a href="https://github.com/zeroven0205-spec/">
    <img height="21" src="https://img.shields.io/badge/Dokumentasi-7d09f1?style=flat-square" alt="document">
  </a>
  <a href="https://github.com/zeroven0205-spec/">
    <img height="21" src="https://img.shields.io/badge/Pengembangan_Lokal-%23d4eaf7?style=flat-square&logo=xcode&logoColor=7d09f1" alt="development">
  </a>
  <a href="#-proyek--tautan-kami">
    <img height="21" src="https://img.shields.io/badge/Proyek_Terkait-7d09f1?style=flat-square" alt="project">
  </a>
</p>

## Mulai Cepat

Anda dapat memulai gptGO dengan cepat menggunakan Docker. Jalankan perintah berikut di terminal dan ikuti panduan untuk menarik konfigurasi.

```bash
# Jalankan perintah untuk menarik file konfigurasi
# Lihat proyek GitHub gptGO untuk konfigurasi deployment
# Jalankan layanan
docker compose up -d
```

Setelah sepenuhnya aktif, Anda dapat mengakses gptGO di `http://localhost:3000`. Akun default adalah `root` dan kata sandinya adalah `1234`.

Jika Anda menghadapi masalah, Anda dapat [melihat tutorial penyebaran Docker lengkap](https://github.com/zeroven0205-spec/)

## 🛸 Cara Penggunaan

- **Versi Cloud**  
  Jika Anda tidak memerlukan penyebaran privat, lihat [proyek GitHub gptGO](https://github.com/zeroven0205-spec/) untuk opsi deployment yang tersedia.

- **Versi Self-Hosted Komunitas**  
  Anda dapat menyebarkan dengan cepat menggunakan [Docker](https://github.com/zeroven0205-spec/) atau menggunakan [Sealos Cloud](https://github.com/zeroven0205-spec/) untuk menyebarkan gptGO dengan satu klik.

- **Versi Komersial**  
  Jika Anda membutuhkan fitur yang lebih lengkap atau dukungan layanan mendalam, Anda dapat memilih [Versi Komersial](https://github.com/zeroven0205-spec/). Selain menyediakan perangkat lunak lengkap, kami juga menyediakan panduan implementasi untuk skenario tertentu. Anda dapat mengirimkan [konsultasi komersial](https://github.com/zeroven0205-spec/).

## 💡 Fitur Inti

|                                    |                                    |
| ---------------------------------- | ---------------------------------- |
| ![Demo](./.github/imgs/intro1.png) | ![Demo](./.github/imgs/intro2.jpg) |
| ![Demo](./.github/imgs/intro3.png) | ![Demo](./.github/imgs/intro4.png) |

`1` Kemampuan Orkestrasi Aplikasi
   - [x] Orkestrasi Agent Skill.
   - [x] Workflow percakapan, workflow plugin, termasuk node RPA dasar.
   - [x] Interaksi pengguna
   - [x] MCP dua arah
   - [ ] Pembuatan workflow otomatis

`2` Kemampuan Debugging Aplikasi
   - [x] Pengujian pencarian satu titik basis pengetahuan
   - [x] Umpan balik referensi selama percakapan dengan kemampuan edit dan hapus
   - [x] Log rantai panggilan lengkap
   - [x] Evaluasi aplikasi
   - [ ] Mode debug DeBug orkestrasi lanjutan
   - [ ] Log node aplikasi

`3` Kemampuan Basis Pengetahuan
   - [x] Penggunaan ulang dan pencampuran multi-database
   - [x] Modifikasi dan penghapusan rekaman chunk
   - [x] Dukungan input manual, segmentasi langsung, impor QA split
   - [x] Dukungan txt, md, html, pdf, docx, pptx, csv, xlsx (lebih banyak dapat di-PR), dukungan pembacaan URL dan impor batch CSV
   - [x] Pencarian hibrida & reranking
   - [x] Basis pengetahuan API
   - [ ] 

`4` Kemampuan Plugin
   - [x] Hot update tool sistem
   - [ ] Hot update modul RAG
   - [ ] Hot update Agent-loop
   - [ ] Plugin yang dibuat AI secara real time

`5` Kemampuan Operasi
   - [x] Jendela berbagi tanpa login
   - [x] Embedding Iframe satu klik
   - [x] Tinjauan catatan percakapan terpadu dengan anotasi data
   - [x] Log operasi aplikasi

<a href="#readme">
    <img src="https://img.shields.io/badge/-Kembali_ke_Atas-7d09f1.svg" alt="#" align="right">
</a>

## 💪 Proyek & Tautan Kami

- [Mulai Cepat Pengembangan Lokal](https://github.com/zeroven0205-spec/)
- [Dokumentasi OpenAPI](https://github.com/zeroven0205-spec/)
- [gptGO-plugin](https://github.com/zeroven0205-spec/)
- [AI Proxy: Layanan Load Balancing Agregasi Model](https://github.com/labring/aiproxy)
- [Sealos: Penerapan Cepat Aplikasi Klaster](https://github.com/labring/sealos)

<a href="#readme">
    <img src="https://img.shields.io/badge/-Kembali_ke_Atas-7d09f1.svg" alt="#" align="right">
</a>

## 🌿 Ekosistem Pihak Ketiga

- [AI Proxy: Layanan Agregasi Model Besar](https://github.com/labring/aiproxy)
- [SiliconCloud - Platform Pengalaman Online Model Open Source](https://cloud.siliconflow.cn/i/TR9Ym0c4)

<a href="#readme">
    <img src="https://img.shields.io/badge/-Kembali_ke_Atas-7d09f1.svg" alt="#" align="right">
</a>

## 🏘️ Komunitas

Bergabung dengan grup Feishu kami:

<a href="#readme">
    <img src="https://img.shields.io/badge/-Kembali_ke_Atas-7d09f1.svg" alt="#" align="right">
</a>

## 🤝 Kontributor

Kami sangat menyambut kontribusi dalam berbagai bentuk. Jika Anda tertarik berkontribusi kode, lihat [Issues GitHub](https://github.com/zeroven0205-spec/) kami dan tunjukkan ide brilian Anda!



<a href="#readme">
    <img src="https://img.shields.io/badge/-Kembali_ke_Atas-7d09f1.svg" alt="#" align="right">
</a>

## Lisensi

Repositori ini mengikuti [Open Source License](./LICENSE).

1. Penggunaan komersial sebagai layanan backend diperbolehkan, tetapi layanan SaaS tidak diperbolehkan.
2. Setiap layanan komersial tanpa otorisasi komersial harus mempertahankan informasi hak cipta yang relevan.
3. Silakan lihat [Open Source License](./LICENSE) untuk detail lengkap.
4. Kontak: Dennis@sealos.io, [Lihat Harga Komersial](https://github.com/zeroven0205-spec/)
