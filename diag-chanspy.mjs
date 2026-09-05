import { createRequire } from "module";
const require = createRequire("/home/irony/code/VueSIP/");
const net = require("net");

const sock = net.createConnection(5038, "192.168.65.129");
let buf = "";
let bridgeChannel = null;
let step = 0;

sock.on("connect", () => {
  sock.write("Action: Login\r\nUsername: DM1RjhF3tlrA\r\nSecret: UlKfW9YhPYvG\r\nEvents: on\r\n\r\n");
});

function send(s) { sock.write(s); }

sock.on("data", (c) => {
  buf += c.toString();
  let idx;
  while ((idx = buf.indexOf("\r\n\r\n")) !== -1) {
    const frame = buf.slice(0, idx);
    buf = buf.slice(idx + 4);
    const pkt = {};
    for (const l of frame.split("\r\n")) {
      const ci = l.indexOf(":");
      if (ci !== -1) pkt[l.slice(0, ci).trim()] = l.slice(ci + 1).trim();
    }
    if (pkt.Response === "Success" && pkt.Message === "Authentication accepted") {
      console.log("[ami] logged in");
      // Step 1: originate a caller into queue 8001 (it will wait unanswered)
      step = 1;
      send("Action: Originate\r\nChannel: Local/8001@from-internal\r\nContext: from-internal\r\nExten: 8001\r\nPriority: 1\r\nCallerID: \"SpyTest\" <5550090>\r\nAsync: true\r\nActionID: spy1\r\n\r\n");
      console.log("[ami] originate sent (caller will wait in queue)");
    } else if (pkt.Response && pkt.ActionID === "spy1") {
      console.log("[resp] originate:", pkt.Response, pkt.Message || "");
    } else if (pkt.Response && pkt.ActionID === "spy2") {
      console.log("[SPY RESULT]", pkt.Response, pkt.Message || "");
    } else if (pkt.Response && pkt.ActionID === "spy3") {
      console.log("[BARGE RESULT]", pkt.Response, pkt.Message || "");
    } else if (pkt.Event === "QueueCallerJoin" && pkt.Queue === "8001" && step === 1) {
      // Caller is waiting in queue. Get the channel and test ChanSpy Originate.
      bridgeChannel = pkt.Channel;
      console.log("[queue] caller channel:", bridgeChannel);
      step = 2;
      // Test spy originate (the supervisor channel will ring but nobody answers —
      // we just need the Originate to be ACCEPTED by Asterisk)
      setTimeout(() => {
        send("Action: Originate\r\nChannel: PJSIP/nurse_1002\r\nApplication: ChanSpy\r\nData: " + bridgeChannel + ",q\r\nCallerID: \"Sup Listen\" <98>\r\nAsync: true\r\nActionID: spy2\r\n\r\n");
        console.log("[ami] spy originate sent (target:", bridgeChannel + ")");
      }, 1000);
      // Test barge originate
      setTimeout(() => {
        send("Action: Originate\r\nChannel: PJSIP/nurse_1002\r\nApplication: ChanSpy\r\nData: " + bridgeChannel + ",B\r\nCallerID: \"Sup Barge\" <99>\r\nAsync: true\r\nActionID: spy3\r\n\r\n");
        console.log("[ami] barge originate sent");
      }, 4000);
    } else if (pkt.Event) {
      if (/ChanSpy|Bridge|Hangup|Originate/.test(pkt.Event)) {
        console.log("[evt]", pkt.Event, "Ch=" + (pkt.Channel || "") + " Dest=" + (pkt.DestChannel || ""));
      }
    }
  }
});

sock.on("error", (e) => console.log("[err]", e.message));
setTimeout(() => { console.log("[done]"); sock.end(); process.exit(0); }, 25000);
