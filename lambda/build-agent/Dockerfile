FROM public.ecr.aws/lambda/nodejs:20

# Install build dependencies
RUN dnf install -y git jq zip unzip && dnf clean all

# Copy handler
COPY handler.ts package.json tsconfig.json ./

# Install and build
RUN npm install && npm run build

CMD ["dist/handler.handler"]
