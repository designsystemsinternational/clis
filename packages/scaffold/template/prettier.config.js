module.exports = {
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  jsxBracketSameLine: true,
  trailingComma: 'es5',
  overrides: [
    {
      files: ['*.css', '*.scss'],
      options: {
        singleQuote: false,
      },
    },
  ],
};
