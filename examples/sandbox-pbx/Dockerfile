FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      software-properties-common \
    && add-apt-repository -y universe \
    && apt-get update && apt-get install -y --no-install-recommends \
      asterisk \
      asterisk-modules \
      asterisk-config \
      asterisk-core-sounds-en \
      asterisk-moh-opsound-g722 \
      ca-certificates \
      openssl \
    && rm -rf /var/lib/apt/lists/*

RUN install -d -o asterisk -g asterisk /var/log/asterisk /var/spool/asterisk /var/run/asterisk /etc/asterisk/keys

COPY --chown=asterisk:asterisk entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh

EXPOSE 8088 8089 5038 10000-10200/udp

USER asterisk
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["asterisk", "-f", "-vvv"]
