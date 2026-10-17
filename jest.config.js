module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns:
    require('jest-expo/jest-preset').transformIgnorePatterns.map(pattern =>
      pattern.replace('(?!(.pnpm|', '(?!(.pnpm|@scure/|@noble/|')
    ),
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
