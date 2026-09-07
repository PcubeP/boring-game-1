FROM node:22-bookworm

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y \
        git \
        curl \
        wget \
        unzip \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@12.3.4 --activate

CMD ["sleep", "infinity"]