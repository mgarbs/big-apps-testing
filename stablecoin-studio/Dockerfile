# Build Environment
FROM alpine:latest AS builder

# Set Working Directory
WORKDIR /app

# Install build dependencies
RUN apk update && apk add build-base
RUN apk add --no-cache git nodejs npm python3 make gcc

# Checkout Stable Coin Studio Contract Folder
RUN git clone https://github.com/hashgraph/stablecoin-studio.git
RUN cd stablecoin-studio/contracts

WORKDIR /app/stablecoin-studio/contracts

#setup npm
RUN npm install
RUN npm ci
RUN npx hardhat compile

# Setup Testing
COPY . .
FROM builder AS runner

# Exclude unnecessary production dependencies
ENV NODE_ENV test

CMD ["npx", "hardhat", "test", "--network", "local"]