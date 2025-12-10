import { test, expect } from './fixtures'
import { APP_URL } from './fixtures'

test('quick EventBridge check', async ({ page, mockSipServer, mockMediaDevices, configureSip }) => {
  // Capture ALL console messages
  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(`[${msg.type()}] ${text}`)
  })

  await mockSipServer()
  await mockMediaDevices()
  await page.goto(APP_URL)

  await configureSip({
    uri: 'wss://sip.example.com:7443',
    username: 'sip:testuser@example.com',
    password: 'testpassword',
  })

  // Check if EventBridge exists
  const hasEventBridge = await page.evaluate(() => {
    return {
      hasEmitSipEvent: typeof (window as any).__emitSipEvent === 'function',
      hasEventBridge: typeof (window as any).__sipEventBridge !== 'undefined',
      windowKeys: Object.keys(window).filter(k => k.includes('sip') || k.includes('Event'))
    }
  })

  console.log('EventBridge check:', JSON.stringify(hasEventBridge, null, 2))

  // Try to click connect
  await page.click('[data-testid="connect-button"]')
  await page.waitForTimeout(2000)

  // Print all logs
  console.log('\n=== BROWSER CONSOLE LOGS ===')
  logs.forEach(log => console.log(log))
  console.log('=== END LOGS ===\n')
})
