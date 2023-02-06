import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { string } from 'rollup-plugin-string';
import externals from 'rollup-plugin-node-externals';

export default [
  {
    input: './src/cli.js',
    output: {
      dir: './dist',
      format: 'esm',
      exports: 'auto',
      sourcemap: true,
    },
    plugins: [
      json(),
      nodeResolve({
        exportConditions: ['node'],
        preferBuiltins: true,
      }),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      string({ include: '**/*.template.hbs' }),
      externals({
        deps: true,
      }),
    ],
  },
];
