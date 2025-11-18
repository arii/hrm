# Use the official Node.js 20 image.
FROM node:20

# Set the working directory in the container.
WORKDIR /workspace

# Copy package.json and package-lock.json to the workspace.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy the rest of the application code to the workspace.
COPY . .

# Expose the port the app runs on.
EXPOSE 3000

# Command to start the development server.
CMD ["npm", "run", "dev"]
