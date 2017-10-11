// ES6 polyfills
import 'core-js/fn/array/for-each';

// preload polyfill
import 'fg-loadcss/src/loadCSS';
import 'fg-loadcss/src/cssrelpreload';

import domready from 'domready';
import { init as emailThread } from './modules/thread';
import { init as missionLog } from './modules/log';

const initEmailThreads = () =>
  [...document.getElementsByClassName('thread')].forEach(thread => emailThread(thread));

const initMissionLogs = () =>
  [...document.getElementsByClassName('log')].forEach(log => missionLog(log));

domready(() => {
  initEmailThreads();
  initMissionLogs();
});
