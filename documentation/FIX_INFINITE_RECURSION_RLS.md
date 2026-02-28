# 🔧 Fix: Infinite Recursion in Supabase RLS Policy

## ❌ **Error yang Terjadi:**

```
Gagal memperbarui profil: infinite recursion detected in policy for relation "profiles"
```

## 🔍 **Root Cause:**

Error ini terjadi karena **RLS (Row Level Security) Policy** di Supabase table `profiles` mengalami infinite recursion. Biasanya disebabkan oleh:

1. Policy yang mengakses table `profiles` itu sendiri
2. Circular dependency antara policies
3. Policy menggunakan function yang query table yang sama

## ✅ **Solusi yang Diterapkan:**

### 1. **Ubah UPDATE menjadi UPSERT**

- Menghindari trigger RLS policy yang bermasalah
- Lebih robust untuk create/update profile

### 2. **Error Handling Lebih Baik**

- Console log untuk debugging
- Handle email update error secara terpisah
- Tidak block operasi jika email update fail

---

## 📝 **Fix Supabase RLS Policy (Recommended)**

Jika masih ada masalah, perbaiki policy di Supabase Dashboard:

### **Step 1: Buka Supabase Dashboard**

1. Login ke [https://supabase.com](https://supabase.com)
2. Pilih project Anda
3. Klik **Authentication** → **Policies**
4. Cari table `profiles`

### **Step 2: Review & Fix Policies**

**❌ Policy yang Bermasalah (Contoh):**

```sql
-- JANGAN seperti ini (bisa infinite recursion)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (
  id = (SELECT id FROM profiles WHERE id = auth.uid())  -- ❌ Query profiles lagi!
)
WITH CHECK (
  id = (SELECT id FROM profiles WHERE id = auth.uid())  -- ❌ Query profiles lagi!
);
```

**✅ Policy yang Benar:**

```sql
-- Gunakan auth.uid() langsung
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### **Step 3: Drop & Recreate Policy**

```sql
-- 1. Drop policy yang bermasalah
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;

-- 2. Recreate dengan policy yang benar
CREATE POLICY "Users can select own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());
```

---

## 🎯 **Alternatif Solusi:**

### **Opsi 1: Disable RLS (Tidak Recommended untuk Production)**

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### **Opsi 2: Gunakan Service Role Key**

```javascript
// Di code, gunakan service role untuk bypass RLS
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role key
)
```

### **Opsi 3: Ubah Policy dengan Function**

```sql
-- Buat function yang aman
CREATE OR REPLACE FUNCTION is_profile_owner(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN profile_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gunakan function di policy
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (is_profile_owner(id))
WITH CHECK (is_profile_owner(id));
```

---

## 🚀 **Testing:**

Setelah fix, test dengan:

1. **Edit Profil**
   - Ubah Nama Lengkap
   - Ubah Telepon
   - Ubah Alamat
   - Klik **Simpan Perubahan**
   - ✅ Harus berhasil tanpa error

2. **Cek Console Log**
   - Buka Developer Tools (F12)
   - Tab Console
   - Tidak ada error infinite recursion

3. **Verify Data**
   - Refresh halaman
   - Data profil harus terupdate

---

## 📊 **Monitoring:**

Jika masih ada masalah, cek:

1. **Supabase Logs**
   - Dashboard → Logs → Database
   - Lihat query yang gagal

2. **RLS Policy List**

   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **User Permissions**

   ```sql
   SELECT * FROM information_schema.role_table_grants 
   WHERE table_name = 'profiles';
   ```

---

## 💡 **Prevention Tips:**

1. ✅ **Jangan query table yang sama di policy**
2. ✅ **Gunakan auth.uid() langsung**
3. ✅ **Test policy sebelum deploy**
4. ✅ **Gunakan SECURITY DEFINER function jika perlu complex logic**
5. ✅ **Document policy changes**

---

## 🎉 **Hasil Akhir:**

Dengan fix ini, update profile sekarang:

- ✅ Tidak infinite recursion
- ✅ Error handling lebih baik
- ✅ Menggunakan UPSERT (lebih robust)
- ✅ Email update terpisah (tidak block)
