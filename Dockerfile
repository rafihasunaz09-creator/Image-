FROM mcr.microsoft.com/playwright:v1.50.0-jammy

WORKDIR /app

# Package files আগে copy
COPY package*.json ./

# Fixed: npm ci এর বদলে npm install
RUN npm install --production

# বাকি সব ফাইল copy
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
