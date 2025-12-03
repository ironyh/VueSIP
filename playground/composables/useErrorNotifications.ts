/**
 * Error Notification Composable for Playground
 *
 * Provides comprehensive error handling with user-friendly messages,
 * troubleshooting hints, and retry capabilities.
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { playgroundSipClient, playgroundAmiClient } from '../sipClient'

// Error categories for better UX messaging
export type ErrorCategory =
  | 'connection'
  | 'registration'
  | 'call'
  | 'media'
  | 'transfer'
  | 'ami'
  | 'network'
  | 'unknown'

// Error severity levels
export type ErrorSeverity = 'info' | 'warn' | 'error' | 'success'

// Error notification interface
export interface ErrorNotification {
  id: string
  category: ErrorCategory
  severity: ErrorSeverity
  title: string
  message: string
  hint?: string
  action?: {
    label: string
    handler: () => void
  }
  timestamp: Date
  raw?: any
}

// SIP error code to user-friendly message mapping
const SIP_ERROR_MESSAGES: Record<number, { title: string; message: string; hint: string }> = {
  // 4xx Client Errors
  400: {
    title: 'Bad Request',
    message: 'The request was malformed or invalid.',
    hint: 'Check your SIP URI format and configuration.',
  },
  401: {
    title: 'Authentication Required',
    message: 'Invalid username or password.',
    hint: 'Verify your credentials in Settings and try again.',
  },
  403: {
    title: 'Forbidden',
    message: 'Access denied by the server.',
    hint: 'Your account may be disabled or restricted. Contact your administrator.',
  },
  404: {
    title: 'User Not Found',
    message: 'The called extension does not exist.',
    hint: 'Check the extension number and try again.',
  },
  408: {
    title: 'Request Timeout',
    message: 'The request timed out waiting for a response.',
    hint: 'Check your network connection and SIP server status.',
  },
  480: {
    title: 'Temporarily Unavailable',
    message: 'The user is temporarily unavailable.',
    hint: 'The user may be offline or have DND enabled. Try again later.',
  },
  486: {
    title: 'Busy Here',
    message: 'The called party is busy.',
    hint: 'Wait for the user to finish their current call or leave a voicemail.',
  },
  487: {
    title: 'Call Cancelled',
    message: 'The call was cancelled before being answered.',
    hint: 'This is normal when you or the remote party cancels the call.',
  },
  488: {
    title: 'Not Acceptable',
    message: 'Media negotiation failed.',
    hint: 'Check your audio/video settings and codec configuration.',
  },

  // 5xx Server Errors
  500: {
    title: 'Server Error',
    message: 'The SIP server encountered an internal error.',
    hint: 'This is a server-side issue. Try again later or contact support.',
  },
  502: {
    title: 'Bad Gateway',
    message: 'The server received an invalid response from upstream.',
    hint: 'Check if the SIP trunk is configured correctly.',
  },
  503: {
    title: 'Service Unavailable',
    message: 'The SIP server is temporarily overloaded or down.',
    hint: 'Wait a few moments and try again. Check server status.',
  },
  504: {
    title: 'Gateway Timeout',
    message: 'The server did not receive a timely response.',
    hint: 'Network connectivity issue. Check your connection.',
  },

  // 6xx Global Failures
  600: {
    title: 'Busy Everywhere',
    message: 'The user is busy on all devices.',
    hint: 'Try calling later or leave a voicemail.',
  },
  603: {
    title: 'Call Declined',
    message: 'The call was declined by the recipient.',
    hint: 'The user chose not to answer. Try messaging instead.',
  },
  604: {
    title: 'Does Not Exist',
    message: 'The destination does not exist anywhere.',
    hint: 'Verify the number/extension and try again.',
  },
  606: {
    title: 'Not Acceptable',
    message: 'The call cannot be completed with current settings.',
    hint: 'Check media and codec compatibility.',
  },
}

// JsSIP cause to user-friendly message mapping
const JSSIP_CAUSE_MESSAGES: Record<string, { title: string; message: string; hint: string }> = {
  'Connection Error': {
    title: 'Connection Failed',
    message: 'Unable to establish a connection to the SIP server.',
    hint: 'Check your WebSocket URL and network connection.',
  },
  'Request Timeout': {
    title: 'Request Timeout',
    message: 'The server did not respond in time.',
    hint: 'Check your network connection and try again.',
  },
  'SIP Failure Code': {
    title: 'SIP Error',
    message: 'The SIP server returned an error.',
    hint: 'Check the server logs for more details.',
  },
  'Internal Error': {
    title: 'Internal Error',
    message: 'An unexpected error occurred.',
    hint: 'Please refresh the page and try again.',
  },
  'Busy': {
    title: 'Line Busy',
    message: 'The called party is currently busy.',
    hint: 'Try calling again later.',
  },
  'Rejected': {
    title: 'Call Rejected',
    message: 'The call was rejected by the recipient.',
    hint: 'The user may have declined the call.',
  },
  'Redirected': {
    title: 'Call Redirected',
    message: 'The call was redirected to another destination.',
    hint: 'The call may be forwarded to voicemail or another extension.',
  },
  'Unavailable': {
    title: 'User Unavailable',
    message: 'The called user is not available.',
    hint: 'The user may be offline or have DND enabled.',
  },
  'Not Found': {
    title: 'Number Not Found',
    message: 'The dialed number does not exist.',
    hint: 'Verify the extension or phone number.',
  },
  'Address Incomplete': {
    title: 'Incomplete Number',
    message: 'The dialed number is incomplete.',
    hint: 'Enter the complete phone number or extension.',
  },
  'Incompatible SDP': {
    title: 'Media Incompatible',
    message: 'Could not negotiate media parameters.',
    hint: 'Check audio/video codec settings.',
  },
  'Authentication Error': {
    title: 'Authentication Failed',
    message: 'Invalid credentials provided.',
    hint: 'Check your username and password in Settings.',
  },
  'Canceled': {
    title: 'Call Cancelled',
    message: 'The call was cancelled.',
    hint: 'No action needed.',
  },
  'No Answer': {
    title: 'No Answer',
    message: 'The call was not answered.',
    hint: 'Try calling again or leave a voicemail.',
  },
  'Expires': {
    title: 'Session Expired',
    message: 'The session has expired.',
    hint: 'Re-register to restore the connection.',
  },
  'No Ack': {
    title: 'Call Setup Failed',
    message: 'Failed to complete call setup.',
    hint: 'This may be a network issue. Try again.',
  },
  'Dialog Error': {
    title: 'Dialog Error',
    message: 'An error occurred in the call dialog.',
    hint: 'End the call and try again.',
  },
  'User Denied Media Access': {
    title: 'Microphone Access Denied',
    message: 'Browser blocked access to microphone.',
    hint: 'Grant microphone permission and try again.',
  },
  'WebRTC Error': {
    title: 'WebRTC Error',
    message: 'A WebRTC error occurred.',
    hint: 'Check browser compatibility and refresh.',
  },
  'Terminated': {
    title: 'Call Ended',
    message: 'The call was terminated.',
    hint: 'The remote party may have hung up.',
  },
}

// Connection error messages
const CONNECTION_ERROR_MESSAGES: Record<string, { title: string; message: string; hint: string }> = {
  'WebSocket connection failed': {
    title: 'Connection Failed',
    message: 'Unable to connect to the SIP server.',
    hint: 'Check that the WebSocket URL is correct and the server is running.',
  },
  'Network unreachable': {
    title: 'Network Error',
    message: 'Cannot reach the SIP server.',
    hint: 'Check your internet connection.',
  },
  'TLS handshake failed': {
    title: 'Security Error',
    message: 'Failed to establish a secure connection.',
    hint: 'The server SSL certificate may be invalid.',
  },
}

/**
 * Composable for managing error notifications in the playground
 */
export function useErrorNotifications() {
  const toast = useToast()
  const notifications = ref<ErrorNotification[]>([])
  const isListening = ref(false)

  // Get the SIP client and event bus
  const { sipClient, error: _sipError, isConnected: _isConnected, isRegistered: _isRegistered } = playgroundSipClient
  const { isConnected: _amiConnected, error: _amiError } = playgroundAmiClient

  // Generate unique ID
  const generateId = () => `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Add notification
  const addNotification = (notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => {
    const fullNotification: ErrorNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
    }

    notifications.value.unshift(fullNotification)

    // Keep only last 50 notifications
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }

    // Show toast
    showToast(fullNotification)

    return fullNotification.id
  }

  // Show toast notification
  const showToast = (notification: ErrorNotification) => {
    const life = notification.severity === 'error' ? 8000 :
                 notification.severity === 'warn' ? 6000 : 4000

    toast.add({
      severity: notification.severity,
      summary: notification.title,
      detail: notification.hint
        ? `${notification.message}\n\n💡 ${notification.hint}`
        : notification.message,
      life,
      group: 'playground-errors',
    })
  }

  // Parse SIP error code from cause
  const parseSipErrorCode = (cause: string): number | null => {
    const match = cause?.match(/(\d{3})/)
    return match ? parseInt(match[1], 10) : null
  }

  // Get error message for SIP code
  const getMessageForSipCode = (code: number) => {
    return SIP_ERROR_MESSAGES[code] || {
      title: `SIP Error ${code}`,
      message: 'An error occurred during the SIP operation.',
      hint: 'Check the server logs for more details.',
    }
  }

  // Get error message for JsSIP cause
  const getMessageForCause = (cause: string) => {
    // Check for exact match
    if (JSSIP_CAUSE_MESSAGES[cause]) {
      return JSSIP_CAUSE_MESSAGES[cause]
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(JSSIP_CAUSE_MESSAGES)) {
      if (cause.toLowerCase().includes(key.toLowerCase())) {
        return value
      }
    }

    // Default message
    return {
      title: 'Error',
      message: cause || 'An unknown error occurred.',
      hint: 'Please try again or check the console for details.',
    }
  }

  // Handle connection events
  const handleConnectionFailed = (event: any) => {
    const errorMsg = event?.error?.message || 'Connection failed'
    const errorInfo = CONNECTION_ERROR_MESSAGES[errorMsg] || {
      title: 'Connection Failed',
      message: errorMsg,
      hint: 'Verify your SIP server URL and credentials.',
    }

    addNotification({
      category: 'connection',
      severity: 'error',
      ...errorInfo,
      action: {
        label: 'Go to Settings',
        handler: () => {
          window.dispatchEvent(new CustomEvent('navigate-to-example', { detail: 'settings' }))
        },
      },
      raw: event,
    })
  }

  const handleDisconnected = (event: any) => {
    // Only notify if this was unexpected (not user-initiated)
    if (event?.error) {
      addNotification({
        category: 'connection',
        severity: 'warn',
        title: 'Disconnected',
        message: 'Lost connection to the SIP server.',
        hint: 'Attempting to reconnect automatically...',
        raw: event,
      })
    }
  }

  const handleReconnecting = () => {
    addNotification({
      category: 'connection',
      severity: 'info',
      title: 'Reconnecting',
      message: 'Attempting to restore connection...',
      hint: 'Please wait while we reconnect.',
    })
  }

  const handleConnected = () => {
    // Only show if we were previously disconnected
    if (notifications.value.some(n => n.category === 'connection' && n.severity === 'warn')) {
      addNotification({
        category: 'connection',
        severity: 'success',
        title: 'Connected',
        message: 'Successfully connected to the SIP server.',
      })
    }
  }

  // Handle registration events
  const handleRegistrationFailed = (event: any) => {
    const cause = event?.cause || event?.response?.reason_phrase || 'Registration failed'
    const sipCode = parseSipErrorCode(cause) || event?.response?.status_code

    let errorInfo = sipCode
      ? getMessageForSipCode(sipCode)
      : getMessageForCause(cause)

    // Enhance message for common issues
    if (sipCode === 401 || cause.includes('Authentication')) {
      errorInfo = {
        title: 'Authentication Failed',
        message: 'Your username or password is incorrect.',
        hint: 'Double-check your credentials in Settings. Make sure you\'re using the correct SIP URI format (e.g., sip:100@your-server.com).',
      }
    }

    addNotification({
      category: 'registration',
      severity: 'error',
      ...errorInfo,
      action: {
        label: 'Check Settings',
        handler: () => {
          window.dispatchEvent(new CustomEvent('navigate-to-example', { detail: 'settings' }))
        },
      },
      raw: event,
    })
  }

  const handleRegistered = () => {
    // Show success only if we had previous registration failures
    const hadFailure = notifications.value.some(
      n => n.category === 'registration' && n.severity === 'error'
    )

    if (hadFailure) {
      addNotification({
        category: 'registration',
        severity: 'success',
        title: 'Registered',
        message: 'Successfully registered with the SIP server.',
        hint: 'You can now make and receive calls.',
      })
    }
  }

  const handleUnregistered = (event: any) => {
    // Only notify if unexpected
    if (event?.cause && event.cause !== 'Unregistration') {
      addNotification({
        category: 'registration',
        severity: 'warn',
        title: 'Unregistered',
        message: 'You have been unregistered from the SIP server.',
        hint: event.cause || 'Your registration may have expired.',
      })
    }
  }

  // Handle call events
  const handleCallFailed = (event: any) => {
    const cause = event?.cause || event?.message || 'Call failed'
    const sipCode = parseSipErrorCode(cause)

    // Skip cancelled calls as they're user-initiated
    if (cause === 'Canceled' || cause === 'Cancelled' || sipCode === 487) {
      return
    }

    const errorInfo = sipCode
      ? getMessageForSipCode(sipCode)
      : getMessageForCause(cause)

    addNotification({
      category: 'call',
      severity: 'error',
      ...errorInfo,
      raw: event,
    })
  }

  // Handle media errors
  const handleMediaError = (event: any) => {
    const error = event?.error || event
    let title = 'Media Error'
    let message = 'An error occurred with audio/video.'
    let hint = 'Check your microphone and camera permissions.'

    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission denied')) {
      title = 'Permission Denied'
      message = 'Microphone access was blocked by your browser.'
      hint = 'Click the camera/microphone icon in your browser\'s address bar to grant permission.'
    } else if (error?.name === 'NotFoundError') {
      title = 'No Devices Found'
      message = 'No microphone or camera was detected.'
      hint = 'Connect a microphone and refresh the page.'
    } else if (error?.name === 'NotReadableError') {
      title = 'Device In Use'
      message = 'The audio/video device is already in use by another application.'
      hint = 'Close other applications using the microphone.'
    }

    addNotification({
      category: 'media',
      severity: 'error',
      title,
      message,
      hint,
      raw: event,
    })
  }

  // Handle transfer events
  const handleTransferFailed = (event: any) => {
    addNotification({
      category: 'transfer',
      severity: 'error',
      title: 'Transfer Failed',
      message: event?.error || 'Failed to transfer the call.',
      hint: 'Make sure the target extension is valid and available.',
      raw: event,
    })
  }

  // Handle AMI errors
  const handleAmiError = (error: any) => {
    addNotification({
      category: 'ami',
      severity: 'warn',
      title: 'AMI Connection Issue',
      message: error?.message || 'Unable to connect to Asterisk Manager Interface.',
      hint: 'AMI features like Click-to-Call and Queue Monitoring require an amiws proxy. Check if it\'s running.',
      raw: error,
    })
  }

  // Clear all notifications
  const clearNotifications = () => {
    notifications.value = []
  }

  // Clear notifications by category
  const clearByCategory = (category: ErrorCategory) => {
    notifications.value = notifications.value.filter(n => n.category !== category)
  }

  // Start listening to events
  const startListening = () => {
    if (isListening.value) return

    const client = sipClient.value
    if (!client) {
      console.warn('SIP client not available for error notifications')
      return
    }

    // Connection events
    client.on('connection_failed', handleConnectionFailed)
    client.on('disconnected', handleDisconnected)
    client.on('reconnecting', handleReconnecting)
    client.on('connected', handleConnected)

    // Registration events
    client.on('registration_failed', handleRegistrationFailed)
    client.on('registered', handleRegistered)
    client.on('unregistered', handleUnregistered)

    // Call events
    client.on('call:failed', handleCallFailed)

    // Transfer events
    client.on('call:transfer_failed', handleTransferFailed)

    isListening.value = true
    console.log('✅ Error notification listeners attached')
  }

  // Stop listening to events
  const stopListening = () => {
    if (!isListening.value) return

    const client = sipClient.value
    if (!client) return

    client.off('connection_failed', handleConnectionFailed)
    client.off('disconnected', handleDisconnected)
    client.off('reconnecting', handleReconnecting)
    client.off('connected', handleConnected)
    client.off('registration_failed', handleRegistrationFailed)
    client.off('registered', handleRegistered)
    client.off('unregistered', handleUnregistered)
    client.off('call:failed', handleCallFailed)
    client.off('call:transfer_failed', handleTransferFailed)

    isListening.value = false
  }

  // Manual error notification methods
  const notifyError = (title: string, message: string, hint?: string, category: ErrorCategory = 'unknown') => {
    return addNotification({
      category,
      severity: 'error',
      title,
      message,
      hint,
    })
  }

  const notifyWarning = (title: string, message: string, hint?: string, category: ErrorCategory = 'unknown') => {
    return addNotification({
      category,
      severity: 'warn',
      title,
      message,
      hint,
    })
  }

  const notifyInfo = (title: string, message: string, hint?: string, category: ErrorCategory = 'unknown') => {
    return addNotification({
      category,
      severity: 'info',
      title,
      message,
      hint,
    })
  }

  const notifySuccess = (title: string, message: string, category: ErrorCategory = 'unknown') => {
    return addNotification({
      category,
      severity: 'success',
      title,
      message,
    })
  }

  // Setup on mount
  onMounted(() => {
    // Wait a bit for SIP client to be initialized
    setTimeout(() => {
      startListening()
    }, 500)
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    // State
    notifications,
    isListening,

    // Methods
    startListening,
    stopListening,
    clearNotifications,
    clearByCategory,

    // Manual notification methods
    notifyError,
    notifyWarning,
    notifyInfo,
    notifySuccess,

    // Error handling utilities
    handleMediaError,
    handleAmiError,
  }
}
