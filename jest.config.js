/**
 * Jest Configuration for Dashboard Testing
 */

module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: true,
                },
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
    },
    testMatch: [
        '<rootDir>/tests/**/*.test.{ts,tsx}',
    ],
    collectCoverageFrom: [
        'src/app/(admin)/dashboard/**/*.{ts,tsx}',
        '!src/app/(admin)/dashboard/**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
}
