FROM public.ecr.aws/lambda/nodejs:22

# build-plugin.sh needs bash, git, jq, find and cp; the handler needs zip.
# (findutils is not in the base image.)
RUN dnf install -y git jq zip unzip findutils && dnf clean all

# Install exact versions from the lock file, build, then drop dev dependencies
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY handler.ts manifest.ts ./
RUN npm run build && npm prune --omit=dev

CMD ["dist/handler.handler"]
