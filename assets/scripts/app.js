// ES6 polyfills
import 'core-js/fn/array/for-each';

import domready from 'domready';
import { init as emailThread } from './modules/thread';
import { init as missionLog } from './modules/log';
import { init as initStateListener } from './modules/scroll';

const initEmailThreads = () =>
  [...document.getElementsByClassName('thread')].forEach(thread => emailThread(thread));

const initMissionLogs = () =>
  [...document.getElementsByClassName('log')].forEach(log => missionLog(log));

domready(() => {
  initEmailThreads();
  initMissionLogs();
  initStateListener();
});
