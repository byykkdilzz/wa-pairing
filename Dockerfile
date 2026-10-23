FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV NODE_ENV=production
ENV SESSION_DIR=/data/sessions
EXPOSE 8000
CMD ["node", "src/index.js"]
