#!/bin/bash
set -euo pipefail

# Deploy Lolabot Factory to AWS
# Prerequisites: AWS CLI, SAM CLI, Docker

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STACK_NAME="${1:-lolabot-factory}"
ENVIRONMENT="${2:-production}"
REGION="${AWS_REGION:-us-east-1}"

echo "==> Deploying Lolabot Factory"
echo "    Stack: ${STACK_NAME}"
echo "    Environment: ${ENVIRONMENT}"
echo "    Region: ${REGION}"
echo ""

# 1. Build the static site
echo "==> Building static site..."
cd "$PROJECT_DIR"
npm run seed    # Generate personality catalog
npm run build   # Next.js static export → out/

# 2. Build and deploy SAM stack
echo "==> Deploying SAM stack..."
cd "$SCRIPT_DIR"
sam build --template template.yaml
sam deploy \
  --stack-name "$STACK_NAME" \
  --parameter-overrides "Environment=${ENVIRONMENT}" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# 3. Get bucket names from stack outputs
SITE_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`SiteBucketName`].OutputValue' \
  --output text \
  --region "$REGION")

# 4. Sync static site to S3
echo "==> Syncing static site to S3..."
aws s3 sync "$PROJECT_DIR/out" "s3://${SITE_BUCKET}" \
  --delete \
  --cache-control "public, max-age=3600" \
  --region "$REGION"

# Upload data files with longer cache
aws s3 cp "$PROJECT_DIR/data/personalities.json" "s3://${SITE_BUCKET}/data/personalities.json" \
  --cache-control "public, max-age=86400" \
  --content-type "application/json" \
  --region "$REGION"

# 5. Get CloudFront distribution URL
SITE_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`SiteUrl`].OutputValue' \
  --output text \
  --region "$REGION")

echo ""
echo "==> Deployment complete!"
echo "    Site: ${SITE_URL}"
echo ""
