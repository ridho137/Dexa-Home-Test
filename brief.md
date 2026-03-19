# FULLSTACK DEVELOPER SKILL TEST

## 1. Mandatory Skills

### Backend
* **Programming Language**: Javascript/Typescript
* **Framework**: NestJS
* **Database**: MySQL, Oracle, MongoDB, SQL Server, atau PostgreSQL (Pilih salah satu)

### Frontend
* **Framework**: React.js

---

## Objectives

### Backend
* Mampu membuat struktur database yang tepat
* Mampu terhubung ke database mana pun
* Mampu membuat API dengan konsep microservices
* Mampu melakukan manipulasi data (CRUD) melalui API

### Frontend
* Mampu membuat halaman / layar aplikasi
* Mampu mengimplementasikan CSS Framework
* Mampu melakukan pemanggilan API dari / ke backend
* Mampu membuat komponen kustom (*custom component*)

---

## Use Case

### 1. Aplikasi Absensi WFH Karyawan
Membuat aplikasi web responsif yang dapat diakses melalui laptop maupun mobile. Karyawan login menggunakan kombinasi email perusahaan dan password.

**Menu Utama:**
* **a. Profil Karyawan**: Menampilkan Nama, Email Perusahaan, Foto, Posisi, dan Nomor Handphone.
    * Karyawan dapat mengubah Foto, Nomor Handphone, dan Password.
    * **Fitur Tambahan (ketika data berubah):**
        1. Notifikasi popup/alert di halaman admin (bebas menggunakan teknologi seperti Firebase).
        2. Data stream/message queue untuk logging ke database terpisah (bebas menggunakan Kafka, RabbitMQ, AWS SQS, atau GCP Pub-Sub).
* **b. Absen**: Karyawan mencatat absen masuk dan pulang.
    * Data yang ditangkap: Tanggal, Waktu, dan Status (Masuk/Pulang).
* **c. Summary Absen**: Menampilkan ringkasan absensi.
    * Default data: Awal bulan s/d hari ini.
    * Fitur filter: Berdasarkan rentang tanggal (*date range*).

---

### 2. Aplikasi Monitoring Karyawan
Web khusus untuk Admin HRD, dengan fitur:
* Menu untuk menambah atau memperbarui data karyawan.
* Menu untuk melihat riwayat absensi seluruh karyawan (*Read Only*).

---

## Ketentuan Teknis & Pengerjaan
* **Arsitektur**: Menggunakan konsep microservices (REST API) yang dapat dikonsumsi oleh kedua aplikasi tersebut.
* **Waktu Pengerjaan**: Target penyelesaian 3-4 hari, maksimal 5 hari.