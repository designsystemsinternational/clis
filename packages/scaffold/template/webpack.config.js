const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv').config();
const getPort = require('get-port');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const StaticSiteGeneratorPlugin = require('static-site-generator-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = async (env, argv) => {
  const mode = argv.mode === 'production' ? 'production' : 'development';
  const isProduction = mode === 'production';

  const envVars = Object.assign(
    {
      'process.env.NODE_ENV': mode,
    },
    dotenv.parsed
  );

  const js = {
    test: /\.(jsx?)$/,
    use: ['babel-loader'],
    exclude: /.+\/node_modules\/.+/,
  };

  const css = {
    test: /\.(css)$/,
    use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader'].concat([
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[name]__[local]',
          },
          localsConvention: 'camelCase',
          importLoaders: 1,
        },
      },
      {
        loader: 'postcss-loader',
        options: {
          sourceMap: true,
        },
      },
    ]),
  };

  const svg = {
    test: /\.(svg)$/,
    use: [
      {
        loader: 'svg-react-loader',
      },
    ],
  };
  const videos = {
    test: /\.(webm|mov|mp(e)?(g)?(4)?)$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name]-[hash].[ext]',
          outputPath: 'assets/files/',
        },
      },
    ],
  };

  const images = {
    test: /\.(png|jp(e)?g)$/,
    use: [
      {
        loader: 'responsive-loader',
        options: {
          name: '[name]-[hash]-[width].[ext]',
          sizes: [300, 600, 1200, 2000],
          quality: 95,
          placeholder: true,
          placeholderSize: 50,
          adapter: require('responsive-loader/sharp'),
        },
      },
    ],
  };

  const files = {
    test: /\.(gif|ttf|otf|woff(2)?|eot)$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name]-[hash].[ext]',
          outputPath: 'assets/files/',
        },
      },
    ],
  };

  const optimization = isProduction
    ? {
        minimizer: [
          new TerserPlugin({
            parallel: true,
            sourceMap: true,
          }),
          new OptimizeCSSAssetsPlugin({}),
        ],
      }
    : {};

  const plugins = [new webpack.EnvironmentPlugin(envVars)].concat(
    isProduction
      ? [
          new StaticSiteGeneratorPlugin({
            crawl: true,
            globals: {
              window: {},
            },
          }),
          new CleanWebpackPlugin(),
          new MiniCssExtractPlugin({
            filename: '[contenthash]-[name].css',
          }),
        ]
      : [
          new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: './index.html',
          }),
          new webpack.HotModuleReplacementPlugin(),
        ]
  );

  const devServer = {
    port: process.env.PORT || (await getPort({ port: 3000 })),
    host: '0.0.0.0',
    disableHostCheck: true,
    historyApiFallback: true,
    hot: !isProduction,
  };

  if (!isProduction) {
    const url = `http://${devServer.host}:${devServer.port}`;
    const pbcopy = require('child_process').spawn('pbcopy');
    pbcopy.stdin.write(url);
    pbcopy.stdin.end();
    console.log(`
******************************************
Copied "${url}" to clipboard.
******************************************
`);
  }

  return {
    mode,
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    entry: { app: './src/index.js' },
    output: {
      path: path.join(__dirname, 'dist'),
      libraryTarget: 'umd',
      publicPath: '/',
      filename: isProduction ? '[contenthash]-[name].js' : '[hash]-[name].js',
      chunkFilename: isProduction
        ? '[contenthash]-[name].[id].chunk.js'
        : '[hash]-[name].[id].chunk.js',
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {},
    },
    module: {
      rules: [js, css, svg, images, videos, files],
    },
    performance: { hints: false },
    optimization,
    plugins,
    devServer,
  };
};
