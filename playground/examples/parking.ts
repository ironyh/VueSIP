import type { ExampleDefinition } from './types'
import ParkingDemo from '../demos/ParkingDemo.vue'

export const parkingExample: ExampleDefinition = {
  id: 'parking',
  icon: '🅿️',
  title: 'Call Parking',
  description: 'Park and retrieve calls from parking lots',
  tags: ['Advanced', 'Call Control', 'PBX'],
  component: ParkingDemo,
  setupGuide: '<p>Call parking allows you to place a call on hold in a parking lot and retrieve it from another phone. Configure your PBX parking lot settings.</p>',
  codeSnippets: [
    {
      title: 'Park a Call',
      description: 'Park the current call to a parking space',
      code: `import { useParking } from 'vuesip'

const parking = useParking(amiClientRef)

// Park the current call
const channel = 'PJSIP/1001-00000001'
const space = await parking.parkCall(channel)
console.log('Call parked at space', space)`,
    },
    {
      title: 'Retrieve Parked Call',
      description: 'Pick up a call from a parking space',
      code: `// Retrieve a parked call
await parking.retrieveCall('701', 'PJSIP/1002')

// List all parked calls
const parkedCalls = parking.parkedCalls.value
parkedCalls.forEach(call => {
  console.log('Space', call.space, '- From:', call.callerIdNum)
})`,
    },
  ],
}
