const path = require('path');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'assets', 'scripts', 'app.js'),
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
  },
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'assets/scripts/')
   ],
  },
};
