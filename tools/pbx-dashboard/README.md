# PBX Test Dashboard

Self-contained HTML dashboard for VueSIP PBX test result aggregation, compatibility tracking, and failure pattern analysis.

## Usage

Open `index.html` directly in a browser — no server required.

- **Overview tab**: Summary metrics, platform scores, compatibility trend chart
- **Compatibility tab**: Feature matrix per PBX platform (SIP, WebSocket, XCCS, Auth, Codecs, WebRTC)
- **Failure Patterns tab**: Aggregated error categories with frequency and affected platforms
- **Raw Results tab**: Load a JSON file (e.g. `test-results/results.json`) via the file picker button

## Data Format

The JSON file should contain:

```json
{
  "results": [
    {
      "id": "r1",
      "timestamp": "2026-04-03T04:00:00Z",
      "pbxPlatform": "Asterisk",
      "pbxVersion": "22.8",
      "vueSipVersion": "2.1.0",
      "testSuite": "registration",
      "status": "passed",
      "duration": 1200,
      "passed": 12,
      "failed": 0,
      "skipped": 0,
      "errors": [],
      "warnings": []
    }
  ],
  "compatibility": {
    "Asterisk 22.8": {
      "sip": "excellent",
      "ws": "good",
      "xccs": "missing",
      "auth": "full",
      "codecs": "full",
      "webrtc": "good",
      "score": 75
    }
  }
}
```
