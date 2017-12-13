const until = (elem, selector, filter) => {
  const siblings = [];

  elem = elem.nextElementSibling;

  while (elem) {
    if (elem.matches(selector)) break;

    if (filter && !elem.matches(filter)) {
      elem = elem.nextElementSibling;
      continue;
    }

    siblings.push(elem);
    elem = elem.nextElementSibling;
  }

  return siblings;
};

const toggleTooltips = (container, tooltips, event) => {
  const closeAllBut = tooltip => [...tooltips].forEach(el => {
    if (el !== tooltip) {
      el.classList.remove('hint--always');
    }
  });

  // CSS tooltips
  if (event.target && event.target.classList.contains('hint--medium')) {
    event.target.classList.toggle('hint--always');

    // make sure there is never more than one tooltip open
    closeAllBut(event.target);
  } else {
    // close all tooltips
    closeAllBut();
  }
};

const init = (container) => {
  const tooltips = container.querySelectorAll('.hint--medium');

  container.addEventListener('click', event => {
    const HIDDEN_CLASS = 'log__entry--hidden';

    if (event.target && event.target.classList.contains(HIDDEN_CLASS)) {
      event.stopPropagation();

      [
        event.target,
        ...until(event.target, `.log__entry:not(.${HIDDEN_CLASS})`),
      ].forEach(el => el.classList.remove(HIDDEN_CLASS));
    }

    toggleTooltips(container, tooltips, event);
  });
};

export { init };
