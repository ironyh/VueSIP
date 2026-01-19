export type IncomingCallInfo = {
  title: string
  body: string
  icon?: string
}

const PERMISSION_KEY = 'vuesip_notifications_enabled'

export function isNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(PERMISSION_KEY) === 'true'
  } catch {
    return false
  }
}

export function setNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PERMISSION_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore storage errors
  }
}

export async function ensurePermission(userGesture?: boolean): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  // Request only if we believe this was initiated by a gesture
  if (userGesture) {
    try {
      const result = await Notification.requestPermission()
      return result === 'granted'
    } catch {
      return false
    }
  }
  return false
}

export async function showIncomingCallNotification(info: IncomingCallInfo): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const n = new Notification(info.title, {
      body: info.body,
      icon: info.icon,
      tag: 'incoming-call',
      requireInteraction: true,
    })
    n.onclick = () => {
      try {
        window.focus()
      } catch {
        /* no-op */
      }
      n.close()
    }
    return true
  } catch {
    return false
  }
}
