/**
 * PWA Install Composable
 * Handles the PWA install prompt and installation state
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const canInstall = ref(false)
  const isInstalled = ref(false)
  const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null)

  // Check if app is already installed
  function checkIfInstalled(): boolean {
    // Check for standalone display mode (PWA is installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true
    }
    // Check for iOS standalone mode
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
      return true
    }
    return false
  }

  // Handle the beforeinstallprompt event
  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault()
    installPromptEvent.value = event as BeforeInstallPromptEvent
    canInstall.value = true
  }

  // Handle app installed event
  function handleAppInstalled() {
    isInstalled.value = true
    canInstall.value = false
    installPromptEvent.value = null
  }

  // Prompt user to install the PWA
  async function promptInstall(): Promise<boolean> {
    if (!installPromptEvent.value) {
      console.warn('Install prompt not available')
      return false
    }

    try {
      await installPromptEvent.value.prompt()
      const { outcome } = await installPromptEvent.value.userChoice

      if (outcome === 'accepted') {
        isInstalled.value = true
        canInstall.value = false
        installPromptEvent.value = null
        return true
      }
    } catch (error) {
      console.error('Failed to show install prompt:', error)
    }

    return false
  }

  onMounted(() => {
    // Check initial install state
    isInstalled.value = checkIfInstalled()

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', (e) => {
      isInstalled.value = e.matches
    })
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    canInstall,
    isInstalled,
    promptInstall,
  }
}
