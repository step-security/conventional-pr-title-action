FROM node:25-alpine@sha256:c8d96e95e88f08f814af06415db9cfd5ab4ebcdf40721327ff2172ff25cfb997

ADD package.json package-lock.json /action/
RUN cd /action && npm ci

ADD src /action/src
ENTRYPOINT ["node", "/action/src/index.js"]
