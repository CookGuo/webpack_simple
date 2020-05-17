#! /user/bin/env node

let path = require('path')

let config = require(path.resolve('webpack.config.js'))

let Compiler = require('../bin/compiler')

let compiler = new Compiler(config)

compiler.run()