FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

ADD package.json package-lock.json /action/
RUN cd /action && npm ci

ADD src /action/src
ENTRYPOINT ["node", "/action/src/index.js"]
