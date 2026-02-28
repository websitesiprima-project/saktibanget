# 🚀 Performance Optimization Guide - SAKTI PLN

## ✅ Optimasi yang Sudah Diterapkan

### 1. **Next.js Configuration** (next.config.mjs)

- ✅ React Strict Mode diaktifkan
- ✅ SWC Minification untuk build lebih cepat
- ✅ Remove console logs di production
- ✅ Image optimization dengan WebP/AVIF
- ✅ CSS optimization experimental feature
- ✅ Package imports optimization

### 2. **Code Splitting & Lazy Loading**

- ✅ Dynamic imports untuk Sidebar & Header
- ✅ Lazy load components yang berat
- ✅ Suspense boundaries untuk loading states

### 3. **Caching Strategy**

- ✅ Custom cache management (60 detik)
- ✅ Browser cache headers via middleware
- ✅ Static asset caching (1 tahun)

### 4. **Custom Hooks**

- ✅ `useFetch` - Optimized data fetching dengan cache
- ✅ `useDebounce` - Prevent excessive updates
- ✅ `usePageVisibility` - Pause updates saat tab hidden

### 5. **Performance Utilities**

- ✅ Debounce & throttle functions
- ✅ Cache management
- ✅ Lazy image loading

---

## 📊 Hasil yang Diharapkan

### Sebelum Optimasi

- ❌ Pindah halaman: 2-3 detik
- ❌ Initial load: 3-5 detik
- ❌ Re-render berlebihan
- ❌ Memory leaks

### Setelah Optimasi

- ✅ Pindah halaman: <500ms
- ✅ Initial load: 1-2 detik
- ✅ Smooth transitions
- ✅ Reduced memory usage

---

## 🔧 Cara Menggunakan Optimasi

### 1. Replace Fetch dengan useFetch Hook

**Sebelum:**
\`\`\`tsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function fetchData() {
    setLoading(true)
    const result = await someService.getData()
    setData(result)
    setLoading(false)
  }
  fetchData()
}, [])
\`\`\`

**Sesudah:**
\`\`\`tsx
import { useFetch } from '@/hooks/useOptimizedFetch'

const { data, loading, error, refetch } = useFetch(
  () => someService.getData(),
  [], // dependencies
  {
    cache: true,
    cacheKey: 'dashboard-data',
    refetchInterval: 60000 // refetch tiap 1 menit
  }
)
\`\`\`

### 2. Gunakan LoadingSpinner

\`\`\`tsx
import LoadingSpinner from '@/components/LoadingSpinner'

{loading && <LoadingSpinner text="Memuat dashboard..." size="medium" />}
\`\`\`

### 3. Debounce Search Input

\`\`\`tsx
import { useDebounce } from '@/hooks/useOptimizedFetch'

const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 500)

useEffect(() => {
  // Fetch hanya setelah user berhenti mengetik 500ms
  if (debouncedSearch) {
    performSearch(debouncedSearch)
  }
}, [debouncedSearch])
\`\`\`

### 4. Lazy Load Images

\`\`\`tsx
import Image from 'next/image'

<Image
  src="/images/logo.png"
  alt="Logo"
  width={200}
  height={100}
  loading="lazy"
  placeholder="blur"
/>
\`\`\`

---

## 🎯 Rekomendasi Tambahan

### 1. **Bundle Size Analysis**

\`\`\`bash
npm run build
npm run analyze
\`\`\`

### 2. **Monitor Performance**

- Gunakan Chrome DevTools Lighthouse
- Check bundle size di `.next/analyze`
- Monitor memory usage

### 3. **Database Optimization**

- Add indexes ke Supabase tables
- Use `select` untuk limit columns
- Pagination untuk large datasets

### 4. **Image Optimization**

- Convert ke WebP format
- Compress images sebelum upload
- Use Next/Image component

### 5. **API Route Optimization**

- Add response caching
- Reduce payload size
- Use database connection pooling

---

## 📈 Monitoring Tools

### Browser DevTools

1. **Network Tab**: Check request times
2. **Performance Tab**: Profile page loads
3. **Lighthouse**: Overall score

### VS Code Extensions

- **Next.js DevTools**
- **React Developer Tools**
- **Bundle Analyzer**

---

## 🚨 Common Performance Issues

### Issue 1: Slow Page Navigation

**Penyebab:** Fetching data on every navigation
**Solusi:** Use caching dengan `useFetch` hook

### Issue 2: Large Bundle Size

**Penyebab:** Import entire libraries
**Solusi:** Use tree-shaking, dynamic imports

### Issue 3: Memory Leaks

**Penyebab:** Subscriptions tidak di-cleanup
**Solusi:** Always return cleanup function di useEffect

### Issue 4: Excessive Re-renders

**Penyebab:** Inline functions, missing memoization
**Solusi:** Use useCallback, useMemo, React.memo

---

## 📞 Support

Jika masih ada masalah performa:

1. Check browser console untuk errors
2. Run Lighthouse audit
3. Check Network tab untuk slow requests
4. Monitor memory usage

**Target Performance:**

- ⚡ First Contentful Paint: <1.5s
- ⚡ Time to Interactive: <2.5s
- ⚡ Largest Contentful Paint: <2.5s
- ⚡ Cumulative Layout Shift: <0.1
