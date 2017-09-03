// ES6 polyfills
import 'core-js/fn/array/for-each';
import 'core-js/fn/array/map';
import 'core-js/fn/object/assign';
import 'core-js/fn/object/is';

// preload polyfill
import 'fg-loadcss/src/loadCSS';
import 'fg-loadcss/src/cssrelpreload';

import domready from 'domready';
import { init as imageTooltips } from './modules/image-tooltips';

const initImageTooltips = () => {
  const tooltips = [...document.getElementsByClassName('js-with-image-tooltips')];

  if (tooltips) {
    tooltips.forEach(image => {
      const options = {
        tooltips: [
          {
            position: [220, 150],
            label: `<span class="visually-hidden">Schlauchboot</span>`,
            content: '...',
          },

          {
            position: [50, 50],
            label: `<span class="visually-hidden">Das Ende vom Schiff</span>`,
            content: '...',
          }
        ],
        origSize: [736, 318],
      };

      image.addEventListener('load', () => {
        imageTooltips(image, options);
      });

    });
  }
};

domready(() => {
  initImageTooltips();
});
