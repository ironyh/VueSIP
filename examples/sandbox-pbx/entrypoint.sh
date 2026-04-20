#!/bin/sh
set -eu

# Overlay our read-only config into the real /etc/asterisk on every boot so
# package defaults (modules.conf, logger.conf, etc.) survive and only the
# files we care about are replaced. Makes the image easy to reason about.
if [ -d /etc/asterisk.d ]; then
  for f in /etc/asterisk.d/*.conf; do
    [ -e "$f" ] || continue
    cp -f "$f" "/etc/asterisk/$(basename "$f")"
  done
fi

# Self-signed cert for local WSS. Production deploys mount real certs over
# /etc/asterisk/keys so this is skipped.
if [ ! -f /etc/asterisk/keys/sandbox.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout /tmp/sandbox.key -out /tmp/sandbox.crt \
    -subj "/CN=vuesip-sandbox-pbx" -days 365 2>/dev/null
  cat /tmp/sandbox.key /tmp/sandbox.crt > /etc/asterisk/keys/sandbox.pem
  rm -f /tmp/sandbox.key /tmp/sandbox.crt
fi

exec "$@"
