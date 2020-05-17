const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
class P{
  apply(compiler) {
    compiler.hooks.run.tap(()=>{
      console.log('run')
    })
  }
}
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve('dist')
  },
  devtool: false,
  plugins: [
    new CleanWebpackPlugin()
  ],
  modules: {
    rules: [
      {
        test: /\.less$/,
        use: [
          path.resolve(__dirname,'loader', 'style-loader'),
          path.resolve(__dirname,'loader', 'less-loader'),
        ]
      }
    ]
  },
  plugins: [
    new p()
  ]
}