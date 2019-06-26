/* global js_beautify */

const libLink = 'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.10.0/beautify.js';

function loadLib() {
  if (typeof js_beautify === 'function') {
    return Promise.resolve(js_beautify);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');

    script.src = libLink;
    script.onload = () => {
      resolve(js_beautify);
    };

    document.head.appendChild(script);
  });
}

function beautify(code) {
  return loadLib().then((beautify) => {
    return beautify(code);
  });
}

export default beautify;
