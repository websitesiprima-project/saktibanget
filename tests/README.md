# Dashboard Testing Documentation

## 📋 Overview

Testing suite untuk fitur dashboard interaktif dengan modal details.

## 🧪 Jenis Testing

### 1. Unit Testing (`Dashboard.test.tsx`)

Testing komponen individual dan fungsi-fungsi terpisah:

- ✅ Rendering widgets
- ✅ Kalkulasi kontrak terlambat
- ✅ Click handlers
- ✅ Hover effects
- ✅ Modal open/close

### 2. Integration Testing (`Dashboard.integration.test.tsx`)

Testing interaksi lengkap dan user flows:

- ✅ End-to-end user flows
- ✅ Data filtering
- ✅ Navigation
- ✅ Real-time updates
- ✅ Multiple modal handling

## 🚀 Cara Menjalankan Testing

### Install Dependencies

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @swc/jest identity-obj-proxy
```

### Run Tests

```bash
# Run semua tests
npm test

# Run tests dengan watch mode
npm test -- --watch

# Run specific test file
npm test Dashboard.test

# Run dengan coverage
npm test -- --coverage

# Run integration tests only
npm test Dashboard.integration
```

## 📊 Test Coverage Target

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🎯 Test Cases

### Widget Tests

1. ✅ Render 4 widgets (Total Kontrak, Kontrak Terlambat, Proses/Review, Total Vendor)
2. ✅ Widgets clickable
3. ✅ Kontrak Terlambat menggunakan warna merah
4. ✅ Hover effects bekerja

### Modal Tests

1. ✅ Modal terbuka saat widget diklik
2. ✅ Modal tertutup saat tombol X diklik
3. ✅ Modal tertutup saat backdrop diklik
4. ✅ Modal tidak tertutup saat content diklik
5. ✅ Menampilkan "Tidak ada data" jika kosong
6. ✅ Menampilkan count yang benar di header

### Navigation Tests

1. ✅ Navigate ke detail kontrak saat item diklik
2. ✅ Navigate ke halaman vendor dengan ID parameter

### Data Calculation Tests

1. ✅ Menghitung kontrak terlambat berdasarkan end_date
2. ✅ Tidak menghitung kontrak yang sudah selesai
3. ✅ Tidak menghitung kontrak yang belum lewat deadline
4. ✅ Filter data sesuai kategori widget

### Integration Tests

1. ✅ Complete user flow: view → click → modal → navigate
2. ✅ Multiple modal handling
3. ✅ Real-time subscription
4. ✅ Data filtering across components

## 📁 Struktur File Testing

```
tests/
├── dashboard/
│   ├── Dashboard.test.tsx              # Unit tests
│   └── Dashboard.integration.test.tsx  # Integration tests
├── setup.ts                            # Test setup global
└── README.md                           # Dokumentasi ini
```

## 🔧 Mock Configuration

### Mocked Modules

- `next/navigation` - Router
- `supabaseClient` - Database
- `vendorService` - API calls

### Sample Mock Data

```typescript
// Contracts
const mockContracts = [
  {
    id: 'CTR001',
    name: 'Kontrak Pengadaan',
    status: 'dalam proses',
    end_date: '2026-01-10', // Late
    vendor_name: 'PT ABC'
  }
]

// Vendors
const mockVendors = [
  {
    id: 'VND001',
    nama: 'PT ABC Elektrik',
    status: 'Aktif'
  }
]
```

## ✨ Best Practices

1. **Gunakan `waitFor`** untuk async operations
2. **Mock external dependencies** (API, router, etc)
3. **Test user behavior** bukan implementation details
4. **Isolate tests** - setiap test independen
5. **Clear mocks** sebelum setiap test
6. **Descriptive test names** - explain what's being tested

## 🐛 Troubleshooting

### Error: "Cannot find module"

```bash
# Install missing dependencies
npm install --save-dev @types/jest
```

### Error: "TextEncoder is not defined"

```typescript
// Add to setup.ts
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder
```

### Error: "window.matchMedia is not a function"

Already handled in `setup.ts`

## 📈 CI/CD Integration

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## 🎓 Learning Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 📝 Next Steps

1. ✅ Setup Jest dan dependencies
2. ✅ Jalankan tests pertama kali
3. ✅ Tambahkan test cases sesuai kebutuhan
4. ✅ Integrate dengan CI/CD pipeline
5. ✅ Monitor coverage dan improve

---

**Last Updated**: January 15, 2026
**Maintainer**: Development Team
