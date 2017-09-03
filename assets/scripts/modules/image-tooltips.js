let origSize;
let tooltips = [];

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
  tooltips = options.tooltips;

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

    // make sure only one tt is open at a time
    tooltips.forEach(current => {
      if (!Object.is(current, tooltip)) {
        hideTooltip(current);
      }
    });
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

  if (tooltip.tooltip) {
    tooltip.tooltip.style.left = `${newX}px`;
    tooltip.tooltip.style.top = `${newY}px`;
  }

  tooltip.actualPosition = [newX, newY];

  return [newY, newY];
};

const showTooltip = (tooltip) => {
  if (!tooltip.tooltip) {
    const { content, actualPosition } = tooltip;
    const node = document.createElement('div');
    node.classList.add('image-tooltip-content');

    if (content) {
      node.innerHTML = content;
    }

    node.style.left = `${actualPosition[0]}px`;
    node.style.top = `${actualPosition[1]}px`;

    tooltip.tooltip = node;
    tooltip.node.parentNode.insertBefore(node, tooltip.node.nextSibling);
  } else {
    tooltip.tooltip.style.display = 'block';
  }
};

const hideTooltip = (tooltip) => {
  if (tooltip.tooltip) {
    tooltip.tooltip.style.display = 'none';
  }
};

export { init, add, remove, updatePosition };
