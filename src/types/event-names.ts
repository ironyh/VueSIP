export const SipEventNames = {
  Connecting: 'sip:connecting',
  Connected: 'sip:connected',
  Disconnected: 'sip:disconnected',
  Registering: 'sip:registering',
  Registered: 'sip:registered',
  Unregistered: 'sip:unregistered',
  RegistrationFailed: 'sip:registration_failed',
  RegistrationExpiring: 'sip:registration_expiring',
  NewSession: 'sip:new_session',
  NewMessage: 'sip:new_message',
  Generic: 'sip:event',
  CallEnded: 'sip:call:ended',
  CallFailed: 'sip:call:failed',
  // Conference
  ConferenceCreated: 'sip:conference:created',
  ConferenceJoined: 'sip:conference:joined',
  ConferenceEnded: 'sip:conference:ended',
  ConferenceParticipantJoined: 'sip:conference:participant:joined',
  ConferenceParticipantLeft: 'sip:conference:participant:left',
  ConferenceParticipantInvited: 'sip:conference:participant:invited',
  ConferenceParticipantRemoved: 'sip:conference:participant:removed',
  ConferenceParticipantMuted: 'sip:conference:participant:muted',
  ConferenceParticipantUnmuted: 'sip:conference:participant:unmuted',
  ConferenceRecordingStarted: 'sip:conference:recording:started',
  ConferenceRecordingStopped: 'sip:conference:recording:stopped',
  // Audio/Video
  AudioMuted: 'sip:audio:muted',
  AudioUnmuted: 'sip:audio:unmuted',
  VideoDisabled: 'sip:video:disabled',
  VideoEnabled: 'sip:video:enabled',
  // Dialog/BLF
  DialogNotify: 'sip:dialog:notify',
  DialogSubscribe: 'sip:dialog:subscribe',
  DialogUnsubscribe: 'sip:dialog:unsubscribe',
  DialogRefreshed: 'sip:dialog:refreshed',
} as const

export type SipEventName = (typeof SipEventNames)[keyof typeof SipEventNames]
