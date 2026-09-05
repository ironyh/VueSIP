import { createRequire } from "module";
const require = createRequire("/home/irony/code/VueSIP/");
const net = require("net");

const sock = net.createConnection(5038, "192.168.65.129");
let buf = "";
sock.on("connect", () => {
  sock.write("Action: Login\r\nUsername: DM1RjhF3tlrA\r\nSecret: UlKfW9YhPYvG\r\nEvents: on,system,call,agent,log,message,dialplan\r\n\r\n");
});
sock.on("data", (c) => {
  buf += c.toString();
  let idx;
  while ((idx = buf.indexOf("\r\n\r\n")) !== -1) {
    const frame = buf.slice(0, idx);
    buf = buf.slice(idx + 4);
    if (/response/i.test(frame) && /Message/i.test(frame)) {
      console.log("[resp]", frame.split("\r\n").slice(1).join(" | ").slice(0, 160));
    } else {
      const ev = (frame.match(/^Event:\s*(.*)$/m) || [])[1];
      if (ev) {
        const get = (k) => (frame.match(new RegExp("^" + k + ":\\s*(.*)$", "m")) || [])[1] || "";
        console.log("[evt]", ev, "| Ch=" + get("Channel"), "| Ch2=" + get("Channel2"), "| Q=" + get("Queue"), "| CID=" + get("CallerIDNum"), "| App=" + get("Application"), get("Context") ? "| Ctx=" + get("Context") + " Ext=" + get("Exten") : "");
      }
    }
  }
});
sock.on("error", (e) => console.log("[err]", e.message));
setTimeout(() => { process.exit(0); }, 90000);
