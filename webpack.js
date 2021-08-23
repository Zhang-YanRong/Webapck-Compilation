const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

function getModuleInfo(file){

  const body = fs.readFileSync(file, 'utf-8')

  // 转化AST语法树
  // 去掉分隔符 用对象表示
  const ast = parser.parse(body, {
    sourceType: "module"
  })

  /**
   *分析 节点遍历 
   */ 

  const deps = {}; // deps: { './add.js': './src\\add.js' },
  traverse(ast, {
    ImportDeclaration({node}){
      const dirname = path.dirname(file); 
      const abspath = './' + path.join(dirname, node.source.value)
      // 收集依赖
      deps[node.source.value] = abspath; 
    }
  })

  // ES6转成ES5
  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });

  const moduleInfo = { file, deps, code };
  return moduleInfo;


}

// const info = getModuleInfo("./src/index.js");
// console.log("info:", info);

// info: {
//   file: './src/index.js',
//   deps: { './add.js': './src\\add.js' },
//   code: '"use strict";\n' +
//     '\n' +
//     'var _add = _interopRequireDefault(require("./add.js"));\n' +
//     '\n' +
//     'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }\n' +
//     '\n' +
//     'console.log((0, _add["default"])(1, 2));'
// }

// 从入口开始对所有文件爬一遍
function parseModule(file) {
  const entry = getModuleInfo(file)
  // 存储info
  const temp = [entry] 
  const depsGraph = {}

  getDeps(temp, entry)

  temp.forEach(info => {
    depsGraph[info.file] = {
      deps: info.deps,
      code: info.code
    }
  })

  return depsGraph

}

// 递归
function getDeps(temp, {deps}) {
  Object.keys(deps).forEach(key => {
    const child = getModuleInfo(deps[key])
    temp.push(child)

    getDeps(temp, child)
  })
}

// const deps = parseModule('./src/index.js')
// console.log(deps)

function bundel(file) {
  const depsGraph = JSON.stringify(parseModule(file)) 
  return `(function(graph){
    function require(file) {
      function absRequire(relPath) {
        return require(graph[file].deps[relPath])
      }
      const exports = {};
      (function(require, exports, code){
        eval(code)
      }(exports, graph[file].code))
      return exports
    }
    require('${file}')
  }(${depsGraph}))
  `
}

const content = bundel('./src/index.js')
!fs.existsSync("./dist") && fs.mkdirSync("./dist");
fs.writeFileSync("./dist/bundle.js", content);