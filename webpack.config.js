// let prod = process.argv.indexOf('-p') >= 0;
let webpack = require('webpack');

module.exports = {
  devServer: {
    compress: true,
    hot: false,
    inline: false,
  },
  entry: {
    app: './src/main.ts',
    // vendor: [],
  },
  module: {
    loaders: [
      {
        test: /\.ts$|\.tsx$/,
        loader: 'awesome-typescript-loader',
      },
    ],
  },
  output: {filename: "app.js"},
  plugins: [
    new webpack.DefinePlugin({'process.env': {NODE_ENV: '"production"'}}),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor', filename: 'vendor.js',
    // }),
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
};
