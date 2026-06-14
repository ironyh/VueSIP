import { describe, bench } from 'vitest'
import { RecordingPlugin } from '../../../src/plugins/RecordingPlugin'
import { PluginContext } from '../../../src/types/plugin.types'

describe('RecordingPlugin.uninstall', () => {
  const setupPlugin = async (numRecordings: number) => {
    const plugin = new RecordingPlugin()
    const context = {
      eventBus: { on: () => {}, off: () => {} }
    } as unknown as PluginContext

    // Mock MediaRecorder
    global.MediaRecorder = class {
      state = 'inactive'
      start() { this.state = 'recording' }
      stop() {
        this.state = 'inactive'
        if (this.onstop) this.onstop(new Event('stop'))
      }
      pause() { this.state = 'paused' }
      resume() { this.state = 'recording' }
      static isTypeSupported() { return true }
    } as any

    await plugin.install(context, { storeInIndexedDB: false })

    for (let i = 0; i < numRecordings; i++) {
      const stream = { getTracks: () => [] } as any
      await plugin.startRecording(`call-${i}`, stream)
    }

    return plugin
  }

  bench('uninstall with 10 recordings', async () => {
    const plugin = await setupPlugin(10)
    await plugin.uninstall({} as any)
  }, { time: 500 })

  bench('uninstall with 50 recordings', async () => {
    const plugin = await setupPlugin(50)
    await plugin.uninstall({} as any)
  }, { time: 500 })
})
