/**
 * Transcription Demo Scenarios
 * Industry-specific conversations with pre-configured keywords
 */

export interface ScenarioKeyword {
  phrase: string
  action: 'alert' | 'highlight' | 'log'
  severity: 'critical' | 'warning' | 'info'
}

export interface TranscriptLine {
  speaker: 'local' | 'remote'
  text: string
  delayMs: number // Delay before showing this line
}

export interface AICoachingSuggestion {
  triggerAfterLine: number
  type: 'tip' | 'warning' | 'success'
  message: string
}

export interface Scenario {
  id: string
  name: string
  icon: string
  description: string
  industry: string
  localRole: string
  remoteRole: string
  keywords: ScenarioKeyword[]
  conversation: TranscriptLine[]
  aiCoaching: AICoachingSuggestion[]
}

export const scenarios: Scenario[] = [
  {
    id: 'healthcare',
    name: 'Healthcare Advice',
    icon: '🏥',
    description: 'Nurse providing patient guidance',
    industry: 'Healthcare',
    localRole: 'Nurse',
    remoteRole: 'Patient',
    keywords: [
      { phrase: 'medication', action: 'highlight', severity: 'info' },
      { phrase: 'dosage', action: 'highlight', severity: 'warning' },
      { phrase: 'allergic', action: 'alert', severity: 'critical' },
      { phrase: 'emergency', action: 'alert', severity: 'critical' },
      { phrase: 'symptoms', action: 'log', severity: 'info' },
    ],
    conversation: [
      {
        speaker: 'local',
        text: 'Good morning, this is Nurse Sarah from City Medical. How can I help you today?',
        delayMs: 0,
      },
      {
        speaker: 'remote',
        text: "Hi, I've been having some symptoms I'm concerned about. I've had a headache for three days.",
        delayMs: 2500,
      },
      {
        speaker: 'local',
        text: 'I understand your concern. Can you describe the headache? Is it constant or does it come and go?',
        delayMs: 3000,
      },
      {
        speaker: 'remote',
        text: "It's mostly constant, and I've also been feeling dizzy when I stand up.",
        delayMs: 3500,
      },
      {
        speaker: 'local',
        text: 'Those symptoms together are important to address. Are you currently taking any medication?',
        delayMs: 3000,
      },
      {
        speaker: 'remote',
        text: 'Yes, I started a new blood pressure medication last week. The dosage is 10mg daily.',
        delayMs: 3500,
      },
      {
        speaker: 'local',
        text: "That's very helpful information. Dizziness can be a side effect. Are you allergic to any medications?",
        delayMs: 4000,
      },
      { speaker: 'remote', text: 'No allergies that I know of.', delayMs: 2000 },
      {
        speaker: 'local',
        text: "Good. I'd recommend scheduling a follow-up with your doctor to review the dosage. In the meantime, rise slowly from sitting positions.",
        delayMs: 4500,
      },
    ],
    aiCoaching: [
      {
        triggerAfterLine: 2,
        type: 'tip',
        message: 'Good open-ended question to gather more details',
      },
      {
        triggerAfterLine: 4,
        type: 'warning',
        message: 'New medication + symptoms - flag for physician review',
      },
      {
        triggerAfterLine: 6,
        type: 'success',
        message: 'Excellent - allergy check before any recommendations',
      },
    ],
  },
  {
    id: 'project-management',
    name: 'Project Status',
    icon: '📊',
    description: 'PM discussing milestones with stakeholder',
    industry: 'Business',
    localRole: 'Project Manager',
    remoteRole: 'Stakeholder',
    keywords: [
      { phrase: 'deadline', action: 'highlight', severity: 'warning' },
      { phrase: 'milestone', action: 'highlight', severity: 'info' },
      { phrase: 'blocker', action: 'alert', severity: 'critical' },
      { phrase: 'budget', action: 'highlight', severity: 'warning' },
      { phrase: 'delayed', action: 'alert', severity: 'warning' },
    ],
    conversation: [
      {
        speaker: 'remote',
        text: 'Hi, I wanted to check in on the project status. How are we tracking against the milestones?',
        delayMs: 0,
      },
      {
        speaker: 'local',
        text: "Good morning! We completed milestone two last week, so we're currently on track.",
        delayMs: 2500,
      },
      {
        speaker: 'remote',
        text: "That's great to hear. What about the deadline for the beta release?",
        delayMs: 3000,
      },
      {
        speaker: 'local',
        text: 'The beta deadline is still March 15th. However, I should mention we have one blocker.',
        delayMs: 3500,
      },
      { speaker: 'remote', text: "A blocker? What's the issue?", delayMs: 2000 },
      {
        speaker: 'local',
        text: 'The third-party API integration is delayed. Their team pushed back delivery by two weeks.',
        delayMs: 3500,
      },
      {
        speaker: 'remote',
        text: 'How does this affect the budget? Will we need additional resources?',
        delayMs: 3000,
      },
      {
        speaker: 'local',
        text: "We've identified a workaround that keeps us within budget. I'll send the updated timeline today.",
        delayMs: 4000,
      },
      {
        speaker: 'remote',
        text: "Perfect. Let's schedule a follow-up next week to review milestone three progress.",
        delayMs: 3000,
      },
    ],
    aiCoaching: [
      { triggerAfterLine: 1, type: 'success', message: 'Clear status update - good communication' },
      { triggerAfterLine: 3, type: 'tip', message: 'Proactively mentioning blockers builds trust' },
      { triggerAfterLine: 7, type: 'success', message: 'Offering solutions shows ownership' },
    ],
  },
  {
    id: 'customer-retention',
    name: 'Retention Call',
    icon: '🛡️',
    description: 'Rep handling cancellation request',
    industry: 'Customer Service',
    localRole: 'Retention Specialist',
    remoteRole: 'Customer',
    keywords: [
      { phrase: 'cancel', action: 'alert', severity: 'critical' },
      { phrase: 'refund', action: 'alert', severity: 'warning' },
      { phrase: 'frustrated', action: 'alert', severity: 'warning' },
      { phrase: 'competitor', action: 'highlight', severity: 'info' },
      { phrase: 'expensive', action: 'highlight', severity: 'warning' },
    ],
    conversation: [
      {
        speaker: 'local',
        text: "Thank you for calling. My name is Alex, and I'm here to help. What can I assist you with today?",
        delayMs: 0,
      },
      {
        speaker: 'remote',
        text: "Hi Alex, I want to cancel my subscription. I've been a customer for two years but I'm frustrated with the recent changes.",
        delayMs: 3500,
      },
      {
        speaker: 'local',
        text: "I'm sorry to hear you're frustrated. I really appreciate your loyalty over these two years. May I ask what specific changes have been concerning?",
        delayMs: 4000,
      },
      {
        speaker: 'remote',
        text: "The price increase was significant, and I feel like it's become too expensive for what I'm getting.",
        delayMs: 3500,
      },
      {
        speaker: 'local',
        text: 'I completely understand. Value for money is important. Let me see what options I can offer you.',
        delayMs: 3000,
      },
      {
        speaker: 'remote',
        text: "I've been looking at a competitor that offers similar features for less.",
        delayMs: 3000,
      },
      {
        speaker: 'local',
        text: 'I appreciate you sharing that. I can offer you our loyalty discount - 30% off for the next six months. Would that help?',
        delayMs: 4000,
      },
      {
        speaker: 'remote',
        text: "That's actually a pretty good offer. Let me think about it. Can you email me the details?",
        delayMs: 3500,
      },
      {
        speaker: 'local',
        text: "Absolutely! I'll send that right over. And just so you know, you can also pause your subscription anytime instead of canceling.",
        delayMs: 4000,
      },
    ],
    aiCoaching: [
      {
        triggerAfterLine: 1,
        type: 'warning',
        message: 'Cancellation intent detected - enter retention mode',
      },
      {
        triggerAfterLine: 2,
        type: 'success',
        message: 'Great empathy response - acknowledged feelings first',
      },
      {
        triggerAfterLine: 5,
        type: 'tip',
        message: 'Competitor mentioned - time to present unique value',
      },
      {
        triggerAfterLine: 8,
        type: 'success',
        message: 'Excellent save with pause option alternative',
      },
    ],
  },
  {
    id: 'restaurant-order',
    name: 'Restaurant Order',
    icon: '🍕',
    description: 'Taking a delivery order',
    industry: 'Food Service',
    localRole: 'Order Taker',
    remoteRole: 'Customer',
    keywords: [
      { phrase: 'allergy', action: 'alert', severity: 'critical' },
      { phrase: 'gluten-free', action: 'highlight', severity: 'warning' },
      { phrase: 'delivery', action: 'log', severity: 'info' },
      { phrase: 'pickup', action: 'log', severity: 'info' },
      { phrase: 'nut', action: 'alert', severity: 'critical' },
    ],
    conversation: [
      {
        speaker: 'local',
        text: "Thank you for calling Mario's Pizzeria! Will this be for delivery or pickup today?",
        delayMs: 0,
      },
      {
        speaker: 'remote',
        text: "Delivery please. I'd like to place an order for two pizzas.",
        delayMs: 2500,
      },
      { speaker: 'local', text: 'Perfect! What would you like on your pizzas?', delayMs: 2000 },
      {
        speaker: 'remote',
        text: 'One large pepperoni, and one medium veggie. Oh, and the veggie needs to be gluten-free if possible.',
        delayMs: 4000,
      },
      {
        speaker: 'local',
        text: 'We do have gluten-free crust available for an extra three dollars. Should I add that?',
        delayMs: 3000,
      },
      {
        speaker: 'remote',
        text: "Yes please. Also, I should mention I have a nut allergy, so please make sure there's no cross-contamination.",
        delayMs: 4000,
      },
      {
        speaker: 'local',
        text: "Absolutely, I'll flag this order for our allergy protocol. Our gluten-free station is separate from nut products.",
        delayMs: 4000,
      },
      {
        speaker: 'remote',
        text: 'Perfect, thank you for being careful about that. How long for delivery?',
        delayMs: 3000,
      },
      {
        speaker: 'local',
        text: 'About 35-40 minutes. Your total is $34.50. Can I get your delivery address?',
        delayMs: 3000,
      },
    ],
    aiCoaching: [
      {
        triggerAfterLine: 3,
        type: 'tip',
        message: 'Dietary restriction noted - verify kitchen can accommodate',
      },
      {
        triggerAfterLine: 5,
        type: 'warning',
        message: 'ALLERGY ALERT: Ensure proper handling protocol',
      },
      { triggerAfterLine: 6, type: 'success', message: 'Excellent - confirmed safety measures' },
    ],
  },
]

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id)
}
