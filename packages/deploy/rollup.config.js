export default [
  {
    input: './src/cli.js',
    output: {
      dir: './dist',
      format: 'esm',
      exports: 'auto',
      preserveModules: true,
      sourcemap: true,
    },
  },
];
