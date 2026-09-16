// Captures the browser's install prompt ourselves so we can show our own
// persistent "Install App" control instead of relying on the native
// mini-infobar, which the browser only ever offers once and can be dismissed
// forever.
let deferredPrompt: any = null;
let installed =
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent("pwa-install-changed"));
});

window.addEventListener("appinstalled", () => {
  installed = true;
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent("pwa-install-changed"));
});

export function getInstallState() {
  return { canInstall: !!deferredPrompt && !installed, isInstalled: installed };
}

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent("pwa-install-changed"));
}
