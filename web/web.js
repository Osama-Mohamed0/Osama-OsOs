'use strict';
// خاص بنسخة الويب: العمل دون إنترنت، طلب تخزين دائم، وزر «تثبيت التطبيق»
(() => {
  let installEvent = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // يطلب من المتصفح ألا يحذف بيانات إنجاز عند امتلاء المساحة
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    if (window.App && App.route() === 'settings') App.render();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    if (window.UI) UI.toast('تم تثبيت إنجاز ✓ تجده الآن بين تطبيقاتك.', { type: 'success' });
  });

  window.InjazWeb = {
    canInstall: () => !!installEvent,
    async install() {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice.catch(() => {});
      installEvent = null;
      if (window.App) App.render();
    },
  };
})();
