FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# dev server only; a production image would build static assets and serve via nginx instead.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
