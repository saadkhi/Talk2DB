const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    rootDir: '../..',
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/sql-chat-app/nextjs-app/src/$1',
    },
    testMatch: [
        '<rootDir>/tests-qa/**/*.test.ts',
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/sql-chat-app/nextjs-app/tsconfig.json' }],
    },
};

module.exports = createJestConfig(customJestConfig);
