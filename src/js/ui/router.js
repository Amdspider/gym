// ═══════════════════════════════════════════════════════
//   ROUTER - Page Visibility Manager
// ═══════════════════════════════════════════════════════
export const Router = {
  current: 'overview',
  storageKey: 'spiderOS_lastPage',
  pages: ['overview', 'habits', 'gym', 'nutrition', 'water', 'analytics', 'history', 'calendar', 'account', 'settings'],

  init() {
    this.validateNavBindings();
    this.current = this.getInitialPage();
    this.goTo(this.current);

    window.addEventListener('hashchange', () => {
      const pageFromHash = this.parseHashPage();
      if (pageFromHash && pageFromHash !== this.current) this.goTo(pageFromHash);
    });

    // Bind sidebar buttons
    document.querySelectorAll('.nb').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.id.replace('nb-', '');
        this.goTo(id);
      });
    });
  },

  goTo(pageId) {
    if (!this.pages.includes(pageId)) {
      console.warn(`[Router] Unknown page id: ${pageId}`);
      return;
    }
    this.current = pageId;

    // Update Sidebar visual
    document.querySelectorAll('.nb').forEach(btn => btn.classList.remove('act'));
    const actBtn = document.getElementById(`nb-${pageId}`);
    if (actBtn) actBtn.classList.add('act');

    // Hardware accelerated hide/show
    document.querySelectorAll('.page').forEach(page => {
      if(page.id === `page-${pageId}`) {
        page.style.display = 'block';
        // Force reflow for animation
        void page.offsetWidth;
        page.classList.add('act');
      } else {
        page.style.display = 'none';
        page.classList.remove('act');
      }
    });

    // Dispatch event so specific modules handle redraws
    document.dispatchEvent(new CustomEvent('nav:changed', { detail: { page: pageId } }));

    // Keep URL/share state in sync
    if (window.location.hash !== `#${pageId}`) {
      window.location.hash = pageId;
    }
    localStorage.setItem(this.storageKey, pageId);
  },

  parseHashPage() {
    const hash = window.location.hash.replace('#', '').trim();
    return this.pages.includes(hash) ? hash : null;
  },

  getInitialPage() {
    const hashPage = this.parseHashPage();
    if (hashPage) return hashPage;

    const saved = localStorage.getItem(this.storageKey);
    if (saved && this.pages.includes(saved)) return saved;

    return this.current;
  },

  validateNavBindings() {
    const navButtons = Array.from(document.querySelectorAll('.nb[id^="nb-"]'));
    const navIds = navButtons.map(btn => btn.id.replace('nb-', ''));
    const pageIds = Array.from(document.querySelectorAll('.page[id^="page-"]'))
      .map(page => page.id.replace('page-', ''));

    navIds.forEach((id) => {
      if (!pageIds.includes(id)) {
        console.warn(`[Router] Nav button "${id}" has no matching page section.`);
      }
      if (!this.pages.includes(id)) {
        console.warn(`[Router] Nav button "${id}" missing from Router.pages.`);
      }
    });
  }
};
