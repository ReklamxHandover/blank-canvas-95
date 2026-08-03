// Web push / SW-backed OS notifications.
// Registers a messaging service worker and exposes helpers to show notifications.

const SW_URL = `${import.meta.env.BASE_URL}notification-sw.js`;

let registrationPromise = null;

export function isSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'Notification' in window;
}

export async function ensureRegistration() {
  if (!isSupported()) return null;
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(SW_URL, { scope: import.meta.env.BASE_URL })
      .catch(err => { console.warn('[push] SW register failed', err); registrationPromise = null; return null; });
  }
  return registrationPromise;
}

export function getPermission() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPermissionIfNeeded() {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return Notification.permission;
  }
}

export async function showAppNotification({ id, title, body, payload }) {
  if (!isSupported() || Notification.permission !== 'granted') return false;
  const reg = await ensureRegistration();
  if (!reg) return false;
  const ctrl = navigator.serviceWorker.controller || (await navigator.serviceWorker.ready).active;
  if (!ctrl) return false;
  ctrl.postMessage({
    type: 'show-notification',
    title,
    body,
    tag: id ? `notif-${id}` : undefined,
    payload: payload || {},
  });
  return true;
}

export function onNotificationClick(handler) {
  if (!isSupported()) return () => {};
  const listener = (event) => {
    if (event.data?.type === 'notification-click') {
      handler(event.data.payload || {});
    }
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
