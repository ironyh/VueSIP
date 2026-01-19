export type IncomingCallInfo = {
  title: string
  body: string
  icon?: string
  callId?: string
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

export async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) || null
  } catch {
    return null
  }
}

export async function showIncomingCallWithActions(info: IncomingCallInfo): Promise<boolean> {
  const reg = await getSWRegistration()
  if (!reg) return false
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    await reg.showNotification(info.title, {
      body: info.body,
      icon: info.icon,
      tag: 'incoming-call',
      requireInteraction: true,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ],
      data: { callId: info.callId ?? null },
    } as NotificationOptions)
    return true
  } catch {
    return false
  }
}
