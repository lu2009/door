FROM node:16-alpine

WORKDIR /node-hiprint-transit

COPY dist/ ./
COPY config.json ./config.json

EXPOSE 17521

CMD ["node", "index.js"]
