const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
// 将源码转换成ast
const babylon = require('babylon')
// 遍历ast成节点树
const traverse = require('@babel/traverse').default
// 替换节点
const types = require('@babel/types')
// 生成替换好的节点
const generator = require('@babel/generator').default
// 用户plugins的处理
const tapable = require('tapable')

class Compiler {
  constructor(config) {
    this.config = config
    // 保存文件的入口id
    this.entryId
    // 保存所需要的模块依赖
    this.modules = {}
    // 入口路径
    this.entry = config.entry
    // 获取工作路径
    this.root = process.cwd()
    const SyncHook = tapable.SyncHook
    this.hooks = {
      run: new SyncHook(),
      done: new SyncHook()
    }

    this.runPlugins()

  }

  runPlugins() {
    const plugins = this.config.plugins
    plugins.forEach(plugin => {
      // 注意这里并不是改变this指向，而是调用plugin的apply方法，将当前Compiler实力传入
      plugin.apply(this)
    })
  }
  /**
   * 解析模块
   * 路径拼接
   * AST解析语法树
   */
  parse(source, parentPath) {
    let ast = babylon.parse(source)
    // 依赖数组
    let dependencies = []
    traverse(ast, {
      CallExpression(p) {
        let node = p.node
        if(node.callee.name === 'require') {
          node.callee.name = '__webpack_require__'
          let moduleName = node.arguments[0].value
          moduleName += path.extname(moduleName) ? '' : '.js'
          moduleName = './' + path.join(parentPath, moduleName)
          dependencies.push(moduleName)
          node.arguments = [types.stringLiteral(moduleName)]
        }
      }
    })
    // 转换后的源码
    let sourceCode = generator(ast).code
    return {sourceCode, dependencies}
  }
  // 发射数据，用数据渲染我们的模版
  emitFile() {
    // 1.拿到输出目录。
    const { path, filename} = this.config.output
    const { entryId, modules } = this
    const main = path.join(path, filename)
    const template = this.getSource(path.join(__dirname, 'main.ejs'))
    const code = ejs.render(template, {
      entryId, modules
    })
    this.assets = {}
    this.assets[main] = code
    fs.writeFileSync(main, this.assets[main])
    this.hooks.run.done()
  }
  // 根据路径来获取源码
  // 所以这里要根据获取源码的文件类型。用规则来处理源码。
  getSource(modulePath) {
    const rules = this.config.modules.rules
    // 这里默认。rules是【】
    rules.forEach(rule => {
      // 拿到每个规则和loader
      const {test, use} = rule
      let len = use.length - 1

      if(test.test(modulePath)) {
        // 递归调用，用loader处理文件
        function normalLoader() {
          let loader = require(use[len--])
          content = loader(content)
          if(len >= 0) {
            normalLoader()
          }
        }
        normalLoader()
      }

    })
    const content = fs.readFileSync(modulePath, 'utf8')
    return content
  }

  buildModule(modulePath, isEntry) {
    let source = this.getSource(modulePath)
    // 拿到文件的模块id src/index = user/webpack/src/index - user/webpack/
    // moduleName = modulePath - this.root
    let moduleName = './' + path.relative(this.root, modulePath)

    if(isEntry) this.entryId = moduleName

    // 我们要将源码的里面的require -> __webpack_require__ 将应用路径加上./src
    // 返回一个依赖列表
    let {sourceCode, dependencies} = this.parse(source, path.dirname(moduleName))
    this.modules[moduleName] = sourceCode
    // 递归调用buildModule 来生成依赖关系
    // a.js 中引用b.js
    dependencies.forEach(dep => {
      this.buildModule(path.join(this.root, dep), false)
    })
  }


  run() {
    this.hooks.run.call()
    // 根据传入的构建模块依赖关系
    const entryPath = path.resolve(this.root, this.entry)
    // true 标志是入口
    this.buildModule(entryPath, true)
    // 发射打包好的文件
    this.emitFile()
  }
}

module.exports = Compiler