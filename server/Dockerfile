FROM node:22-alpine
WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --production
COPY . .
WORKDIR /app/server
CMD ["node", "server.js"]
