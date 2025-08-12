FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /app/data

EXPOSE 1234

CMD ["npm", "run", "dev"]