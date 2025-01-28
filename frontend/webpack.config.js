const path = require('path');

module.exports = {
  entry: {
    home: './js/home.js',
    nft: './js/nft.js',
    registration: './js/registration.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production', // 'development' or 'production' for optimized bundles
  watchOptions: {
    ignored: /node_modules/,
  },
};
