const COLLAPSED_CSS_CLASS = 'email--collapsed';
let ITEMS;

const collapseThread = (container) => {
  container.classList.add('thread--collapsed');
};

const expandThread = (container) => {
  container.classList.remove('thread--collapsed');
};

const getEmailContent = (item) => {
  return item.getElementsByClassName('email')[0];
};

const closeAllBut = (except) => {
  ITEMS.forEach(item => {
    if (item !== except) {
      closeItem(item);
    }
  });
};

const closeItem = (item) => {
  return getEmailContent(item).classList.add(COLLAPSED_CSS_CLASS);
};

const openItem = (item) => {
  const target = getEmailContent(item);

  target.classList.remove(COLLAPSED_CSS_CLASS);

  setTimeout(() => {
    const { top } = target.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || document.body.scrollTop;

    if (top) {
      window.scrollTo(0, top + scrollY - 60);
    }
  }, 20);

  return;
};

const init = (container) => {
  const open = (event) => {
    event.preventDefault();

    const { target } = event;
    const closest = target.closest('.thread__list-item');
    let item;

    if (target.matches('.thread__list-item')) {
      item = target;
    } else if (closest) {
      item = closest;
    }

    if (target.matches('.thread-expand')) {
      expandThread(target.closest('.thread'));
    }

    if (item) {
      openItem(item);
      closeAllBut(item);
    }
  };

  ITEMS = [...container.getElementsByClassName('thread__list-item')];

  closeAllBut(ITEMS[0]);
  collapseThread(container);

  container.addEventListener('click', open);
  container.addEventListener('keydown', (event) => {
    if(event.keyCode === 13) {
      open(event);
    }
  });
};

export { init };
