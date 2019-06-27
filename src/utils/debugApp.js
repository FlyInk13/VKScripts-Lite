/* global eruda */

const libLink = '//cdn.jsdelivr.net/npm/eruda';

function loadLib() {
  if (typeof eruda !== 'undefined') {
    return;
  }

  const script = document.createElement('script');

  script.src = libLink;
  script.onload = () => {
    eruda.init();
  };

  document.head.appendChild(script);
}

export default loadLib;
