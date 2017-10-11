// ES6 polyfills
import 'core-js/fn/array/for-each';

// preload polyfill
import 'fg-loadcss/src/loadCSS';
import 'fg-loadcss/src/cssrelpreload';

import domready from 'domready';
import { init as emailThread } from './modules/thread';

const initEmailThreads = () => {
  const threads = [...document.querySelectorAll('.thread')];

  return threads.forEach(thread => emailThread(thread));
};

domready(() => {
  initEmailThreads();
});
