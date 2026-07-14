FROM node:18-alpine

WORKDIR /workspace

# Install dependencies
COPY package.json ./
RUN npm install

# Copy configuration and code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
