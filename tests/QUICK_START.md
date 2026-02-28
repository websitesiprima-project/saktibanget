# 🚀 Quick Start - Dashboard Testing

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Run Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Unit tests only
npm test Dashboard.test

# Integration tests only
npm test Dashboard.integration
```

### Watch Mode (Auto-rerun on changes)

```bash
npm run test:watch
# atau
npm test -- --watch
```

### Coverage Report

```bash
npm run test:coverage
# atau
npm test -- --coverage
```

## Step 3: View Results

Test output akan menampilkan:

- ✅ Passed tests (hijau)
- ❌ Failed tests (merah)
- Coverage percentage
- Execution time

### Example Output

```
PASS  tests/dashboard/Dashboard.test.tsx
  Dashboard Component
    Widget Rendering
      ✓ should render all 4 dashboard widgets (45ms)
      ✓ widgets should be clickable (12ms)
    Kontrak Terlambat Widget
      ✓ should display "Kontrak Terlambat" (8ms)
      ✓ should use red color for late contracts (10ms)
    Modal Interactions
      ✓ should open modal when clicked (25ms)
      ✓ should close modal when X clicked (18ms)

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        3.241s
```

## Step 4: Coverage Report

Setelah run `npm test:coverage`, buka:

```
coverage/lcov-report/index.html
```

Target coverage: **70%** untuk semua metrics.

## 🐛 Troubleshooting

### Issue: "Cannot find module jest"

**Solution:**

```bash
npm install --save-dev jest jest-environment-jsdom
```

### Issue: "TextEncoder is not defined"

**Solution:** Already fixed in `tests/setup.ts`

### Issue: Tests timeout

**Solution:**

```bash
# Increase timeout
npm test -- --testTimeout=10000
```

## 📊 Test Statistics

**Total Test Cases:** 25+

- Unit Tests: 15
- Integration Tests: 10

**Coverage Target:**

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🎯 What's Being Tested?

### Dashboard Features

1. ✅ Widget rendering (4 cards)
2. ✅ Kontrak Terlambat calculation
3. ✅ Modal interactions (open/close)
4. ✅ Navigation flows
5. ✅ Hover effects
6. ✅ Data filtering
7. ✅ Real-time updates

### User Flows

1. ✅ View dashboard → Click widget → See modal → Navigate
2. ✅ View late contracts
3. ✅ View vendors → Click vendor → Navigate to detail
4. ✅ Multiple modal handling

## 📝 Next Steps

1. ✅ Review test results
2. ✅ Fix any failing tests
3. ✅ Improve coverage if < 70%
4. ✅ Add more test cases if needed
5. ✅ Integrate with CI/CD

## 🔗 Helpful Links

- [Full Documentation](./README.md)
- [Test Utilities](./utils.tsx)
- [Jest Config](../jest.config.js)

---

**Need Help?** Check `tests/README.md` for detailed documentation.
