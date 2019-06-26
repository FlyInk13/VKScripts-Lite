const acorn = require('acorn');
const acornWalk = require('acorn-walk');
const awaitFunctions = {
  'API': 1,
  'alert': 1,
  'prompt': 1,
  'vk.auth': 1,
  'vk.connect': 1,
};
const codeEnv = `
Object.assign(window, windowData);
vk.access_token = window.accessToken;
delete window.accessToken;
window.addEventListener('error', function (event) {
  console.error('error', event.reason);
});
window.addEventListener('unhandledrejection', function (event) {
  console.error('Unhandled promise rejection:', event.reason);
});
Run().then(function(res) {
  if (typeof res !== 'undefined') {
    console.log(res)
  }
}).catch(console.error)
`;

function buildCode(code) {
  const inserts = [];

  code = `async function Run() {${code} }` + codeEnv;
  acornWalk.simple(acorn.parse(code), {
    CallExpression(node) {

      let childNode = node.callee;
      const functionPath = [];
      let functionName = '';
      while (childNode && childNode.type === 'MemberExpression') {
        functionPath.push(childNode.property.name);
        childNode = childNode.object;
      }

      functionPath.unshift(childNode.name);
      functionName = functionPath.join('.');

      if (!awaitFunctions[childNode.name] && !awaitFunctions[functionName]) return;

      if (childNode.name === 'API') {
        inserts.push({
          code: 'vk.getMethod',
          pos: node.start,
          delete: 3,
        },{
          code: '("',
          pos: node.start + 3,
          delete: 1,
        }, {
          code: '")',
          pos: node.start + functionName.length,
        });
      }

      inserts.push({
        code: '(await ',
        pos: node.start,
      }, {
        code: ')',
        pos: node.end,
      });
    }
  });

  inserts.sort((a, b) => {
    return b.pos - a.pos;
  }).forEach(function insertToCode(insert) {
    insert.delete = insert.delete || 0;
    code = code.substr(0, insert.pos) + insert.code + code.substr(insert.pos + insert.delete);
  });

  return code;
}

export default buildCode;
