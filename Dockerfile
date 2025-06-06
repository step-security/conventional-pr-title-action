FROM node:24-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e

ADD package.json package-lock.json /action/
RUN cd /action && npm ci

ADD src /action/src
ENTRYPOINT ["node", "/action/src/index.js"]
