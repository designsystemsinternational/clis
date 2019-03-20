# Scaffold

This is a command-line tool to generate a sensible React project scaffold. Goes nicely hand in hand with [`@designsystemsinternational/static`](https://www.npmjs.com/package/@designsystemsinternational/static) for deployment.

The generated project comes with a solid `webpack.config.js` package setup:

- Babel and `@babel/preset-react`
- Postcss and `postcss-preset-env`
- Development server with hot module loading and automatic port allocation
- Production build with minification and file fingerprinting
- Support for CSS modules, sourcemaps (development), and class renaming (production)
- Support for responsive `jpg` and `png` images via `responsive-loader` and `sharp`
- SVG files are automatically converted to React components with `svg-react-loader`
- All other assets files are handled via `file-loader`
- Support for `.env` files that are loading into client side `process.env.VAR_NAME`
- Testing with Jest and Enzyme
- Store setup with `react-waterfall` and `immutable`

## Usage

First install the command line tool

```
$ npm i -g @designsystemsinternational/scaffold
```

Then run the generator and follow the instructions.

```
$ scaffold
```
