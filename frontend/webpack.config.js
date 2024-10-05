const path = require('path');

module.exports = {
  entry: {
    home: './js/home.js',
    nft: './js/nft.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production', // or 'production' for optimized bundles
};
