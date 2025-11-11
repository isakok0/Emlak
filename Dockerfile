# Server Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server files
COPY server ./server

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]


