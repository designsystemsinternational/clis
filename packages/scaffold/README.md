# Scaffold

This is a command-line tool to generate a sensible React project scaffold. Goes nicely hand in hand with [`@designsystemsinternational/static`](https://www.npmjs.com/package/@designsystemsinternational/static) for deployment.

The generated project comes with a solid `webpack.config.js` package setup:

- ES6 and React compilcation with Babel
- CSS with PostCSS and CSS Modules
- Development server with hot module loading and automatic port allocation
- Production build with minification, file fingerprinting, and CSS class renaming
- Automatic image resizing via `import` for `jpg` and `png` images
- Automatic conversion of `svg` to React components via `import`
- All other assets files are handled via `file-loader`
- Support for `.env` files that are loading into client side `process.env.VAR_NAME`
- Default hooks to load data from API's, etc
- Optional testing with Jest and Enzyme

## Usage

First install the command line tool

```
$ npm i -g @designsystemsinternational/scaffold
```

Then run the generator and follow the instructions.

```
$ scaffold
```
