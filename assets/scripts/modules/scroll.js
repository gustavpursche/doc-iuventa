const navigation = document.querySelector('.navigation');
const items = [...navigation.children];
const titles = [...document.querySelectorAll('.chapter-title')];

const updateNavigation = id => {
  items.forEach(item => {
    const href = item.getAttribute('href').substring(1);
    item.classList.toggle('navigation__entry--active', href === id);
  });
};

const init = () => {
  // Feature test
  if (!window.IntersectionObserver) {
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting === true) {
        updateNavigation(entry.target.id);
      }
    });
  });

  titles.forEach(title => {
    if (title.id) {
      observer.observe(title);
    }
  });
};

export { init };
