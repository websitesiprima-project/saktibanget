# 🟢 Panduan Setup Supabase Keep-Alive

Sistem ini mencegah Supabase free tier melakukan **auto-pause** (yang terjadi setelah 7 hari tanpa aktivitas) dengan melakukan ping otomatis ke database.

---

## 📁 File yang Dibuat

| File | Fungsi |
|------|--------|
| `src/app/api/keep-alive/route.ts` | API endpoint yang melakukan query ringan ke Supabase |
| `src/app/keep-alive/page.tsx` | Dashboard UI untuk manual ping & cek status |
| `vercel.json` | Konfigurasi Vercel Cron (otomatis setiap 2 hari) |

---

## 🔧 Environment Variable

Tambahkan di `.env.local` (lokal) dan di dashboard hosting Anda:

```env
# (Opsional tapi SANGAT disarankan) Secret untuk proteksi endpoint
CRON_SECRET=ganti-dengan-random-string-yang-panjang-dan-aman
```

> **Cara generate secret:** Jalankan di terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 🚀 Opsi Setup (Pilih Salah Satu atau Kombinasi)

### Opsi 1: Vercel Cron (Paling Mudah — TANPA GitHub Actions)

Jika Anda deploy di **Vercel**, cron sudah dikonfigurasi otomatis via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "0 6 */2 * *"
    }
  ]
}
```

**Yang perlu dilakukan:**
1. Set `CRON_SECRET` di **Vercel Dashboard** → Settings → Environment Variables
2. Deploy ulang (Vercel otomatis mendeteksi `vercel.json`)
3. Cek di **Vercel Dashboard** → Cron Jobs untuk memastikan sudah terdaftar

> Schedule `0 6 */2 * *` = setiap 2 hari sekali jam 06:00 UTC

---

### Opsi 2: cron-job.org (Gratis, Tanpa Server)

**[cron-job.org](https://cron-job.org)** adalah layanan cron gratis yang bisa memanggil URL secara berkala.

**Langkah setup:**
1. Daftar gratis di https://cron-job.org
2. Klik **"Create Cronjob"**
3. Isi form:
   - **Title:** `Supabase Keep Alive`
   - **URL:** `https://domain-anda.vercel.app/api/keep-alive?secret=ISI_CRON_SECRET_ANDA`
   - **Schedule:** Every 2 days (atau custom: `0 6 */2 * *`)
   - **Request Method:** GET
   - **Enable:** ✅
4. Simpan

> 💡 cron-job.org memberikan **gratis** unlimited cron jobs.

---

### Opsi 3: UptimeRobot (Gratis, Monitoring + Keep-Alive)

**[UptimeRobot](https://uptimerobot.com)** berfungsi ganda: monitoring uptime + keep-alive.

**Langkah setup:**
1. Daftar gratis di https://uptimerobot.com
2. Klik **"Add New Monitor"**
3. Isi form:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `SAKTI Supabase Keep Alive`
   - **URL:** `https://domain-anda.vercel.app/api/keep-alive?secret=ISI_CRON_SECRET_ANDA`
   - **Monitoring Interval:** 5 minutes (minimum gratis)
4. Simpan

> ⚠️ UptimeRobot gratis hanya mendukung interval **minimum 5 menit**. Ini sebenarnya lebih bagus karena ping lebih sering, tapi akan menambah banyak entry di audit_logs.

---

### Opsi 4: Render.com Cron Job (Gratis)

**[Render](https://render.com)** menyediakan cron job gratis.

1. Daftar di https://render.com
2. Buat **Cron Job** baru
3. Isi:
   - **Command:** `curl https://domain-anda.vercel.app/api/keep-alive?secret=ISI_CRON_SECRET_ANDA`
   - **Schedule:** `0 6 */2 * *`
4. Deploy

---

### Opsi 5: EasyCron (Gratis)

**[EasyCron](https://www.easycron.com)** menyediakan 1 cron gratis.

1. Daftar di https://www.easycron.com
2. Tambah cron job baru
3. URL: `https://domain-anda.vercel.app/api/keep-alive?secret=ISI_CRON_SECRET_ANDA`
4. Schedule: setiap 2 hari

---

## 🎯 Rekomendasi Kombinasi (Paling Aman)

Untuk keamanan maksimal, gunakan **2 layanan sekaligus** sebagai backup:

| Primary | Backup |
|---------|--------|
| Vercel Cron (setiap 2 hari) | cron-job.org (setiap 3 hari) |

Jika salah satu gagal, yang lain akan tetap menjaga Supabase tetap aktif.

---

## 🧪 Testing

### Manual via Browser
Buka: `https://domain-anda.vercel.app/keep-alive`

### Manual via curl
```bash
# Tanpa secret (jika CRON_SECRET belum diset)
curl https://domain-anda.vercel.app/api/keep-alive

# Dengan secret (via query parameter)
curl "https://domain-anda.vercel.app/api/keep-alive?secret=ISI_CRON_SECRET_ANDA"

# Dengan secret (via header - format Vercel Cron)
curl -H "Authorization: Bearer ISI_CRON_SECRET_ANDA" https://domain-anda.vercel.app/api/keep-alive
```

### Response Sukses
```json
{
  "success": true,
  "message": "🟢 Supabase is alive! Database pinged successfully.",
  "timestamp": "2026-03-02T06:00:00.000Z",
  "responseTimeMs": 145,
  "query": { "table": "profiles", "count": null },
  "nextPauseThreshold": "7 days of inactivity",
  "status": "active"
}
```

---

## ❓ FAQ

**Q: Apakah ini melanggar ToS Supabase?**  
A: Tidak. Melakukan query rutin ke database adalah penggunaan normal. Supabase sendiri menyarankan untuk menjaga aktivitas agar proyek tidak di-pause.

**Q: Berapa biaya yang dikeluarkan?**  
A: $0. Semua layanan yang disebutkan di atas memiliki tier gratis.

**Q: Bagaimana jika sudah terlanjur pause?**  
A: Login ke dashboard Supabase → projectmu → klik "Restore" → tunggu beberapa menit.

**Q: Apakah perlu buat RPC function `ping_keepalive` di Supabase?**  
A: Tidak wajib. Sistem sudah memiliki fallback ke query tabel `profiles` atau `vendors`. Tapi jika ingin lebih optimal, buat function ini di SQL Editor Supabase:

```sql
CREATE OR REPLACE FUNCTION ping_keepalive()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'pong'::text;
$$;
```
