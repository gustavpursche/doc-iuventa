let origSize;

const debounce = (callback, wait, context = this) => {
  let timeout = null
  let callbackArgs = null

  const later = () => callback.apply(context, callbackArgs)

  return () => {
    callbackArgs = arguments
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  };
};

const init = (image, opts) => {
  const defaults = {
    tooltips: [],
    throttled: 200,
  };
  const options = Object.assign({}, defaults, opts);
  const resize = debounce(() => {
    options.tooltips.map(tooltip => updatePosition(tooltip, image));
  }, options.throttled);

  origSize = options.origSize;

  window.addEventListener('resize', resize);

  return options.tooltips.map(tooltip => add(tooltip, image));
};

const add = (tooltip, image) => {
  const { label, events, position } = tooltip;
  const button = document.createElement('button');
  button.classList.add('image-tooltip');

  if (label) {
    button.innerHTML = label;
  }

  // insert button after image
  image.parentNode.insertBefore(button, image.nextSibling);

  // add events
  button.addEventListener('click', (event) => {
    event.preventDefault();
    showTooltip(tooltip);
  });

  tooltip.node = button;

  // calculate position
  return updatePosition(tooltip, image);
};

const updatePosition = (tooltip, image) => {
  const { node, position } = tooltip;
  const { width, height } = image;
  const newX = (position[0] * width) / origSize[0];
  const newY = (position[1] * height) / origSize[1];

  node.style.left = `${newX}px`;
  node.style.top = `${newY}px`;

  return [newY, newY];
};

const showTooltip = (tooltip) => {
  const { content } = tooltip;
};

const hideTooltip = (tooltip) => {

};

export { init, add, remove, updatePosition };
