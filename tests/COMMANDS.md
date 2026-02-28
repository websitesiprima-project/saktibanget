# NPM Test Commands Reference

## ✅ Cara yang BENAR

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### Alternative Commands (Using --)

```bash
# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test file
npm test -- Dashboard.test

# Verbose output
npm test -- --verbose
```

## ❌ Yang SALAH

```bash
npm test:watch      # ❌ SALAH - missing 'run'
npm test:coverage   # ❌ SALAH - missing 'run'
```

## 🎯 Quick Reference

| What You Want | Command |
|---------------|---------|
| Run all tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Coverage | `npm run test:coverage` |
| Specific file | `npm test Dashboard.test` |
| CI/CD mode | `npm run test:ci` |

## 💡 Tips

1. **Use `npm test`** untuk command "test" langsung
2. **Use `npm run`** untuk custom scripts (test:watch, test:coverage, dll)
3. **Use `--`** untuk pass arguments ke script: `npm test -- --watch`

## Example Workflow

```bash
# 1. First run - check if tests pass
npm test

# 2. Development - watch mode for continuous testing
npm run test:watch

# 3. Before commit - check coverage
npm run test:coverage

# 4. In CI/CD pipeline
npm run test:ci
```

---

**Remember**: Custom npm scripts need `npm run`, built-in scripts (like `test`, `start`, `build`) don't!
