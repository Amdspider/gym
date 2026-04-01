// ═══════════════════════════════════════════════════════
//   ROUTER - Page Visibility Manager
// ═══════════════════════════════════════════════════════
export const Router = {
  current: 'overview',
  pages: ['overview', 'habits', 'gym', 'nutrition', 'water', 'analytics', 'history', 'account', 'settings'],

  init() {
    this.goTo(this.current);
    // Bind sidebar buttons
    document.querySelectorAll('.nb').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.id.replace('nb-', '');
        this.goTo(id);
      });
    });
  },

  goTo(pageId) {
    if (!this.pages.includes(pageId)) return;
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
  }
};
