const list = {
  "index.js": `
    const add = require('add.js').default
    console.log(add(2))
  `,
  "add.js": `(function(){var b = 4;exports.default = function(a){return a + b}}())`
};

(function(){
  function require(file) {
    const exports = {};
    (function(exports, code){
      eval(code)
    }(exports, list[file]))
    return exports
  }
  require('index.js')
}())

