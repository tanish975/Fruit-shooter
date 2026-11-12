// Thin wrapper over Capacitor so the same code runs in a browser and inside the APK.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { store } from './store.js';

export const isNative = Capacitor.isNativePlatform();

const styles = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
const webPattern = { light: 8, medium: 18, heavy: 40 };
let lastBuzz = 0;

export function buzz(kind = 'light') {
  if (!store.data.settings.haptics) return;
  const now = performance.now();
  if (kind === 'light' && now - lastBuzz < 45) return; // don't flood the motor during skewers
  lastBuzz = now;
  if (isNative) {
    if (kind === 'success') Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    else if (kind === 'error') Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    else Haptics.impact({ style: styles[kind] || ImpactStyle.Light }).catch(() => {});
  } else if (navigator.vibrate) {
    try { navigator.vibrate(webPattern[kind] || 25); } catch { /* not allowed before a gesture */ }
  }
}

export function onBack(handler) {
  if (isNative) App.addListener('backButton', handler);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') handler(); });
}

export function onAppPause(handler) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) handler(); });
  if (isNative) App.addListener('appStateChange', s => { if (!s.isActive) handler(); });
}

export function exitApp() { if (isNative) App.exitApp(); }

/**
 * Schedule (or clear) the daily return reminders. `msgs[i]` fires at 18:00, i+1 days from now.
 * Resolves false when the player turned reminders on but permission was refused.
 */
export async function setReminders(on, msgs) {
  if (!isNative) return true;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const ids = msgs.map((_, i) => ({ id: 100 + i }));
    await LocalNotifications.cancel({ notifications: ids });
    if (!on) return true;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    const notifications = msgs.map((m, i) => {
      const at = new Date(); at.setDate(at.getDate() + i + 1); at.setHours(18, 0, 0, 0);
      return { id: 100 + i, title: m.title, body: m.body, schedule: { at, allowWhileIdle: true } };
    });
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch { return false; }
}
