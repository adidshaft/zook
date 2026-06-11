#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
APP_NAME="${APP_NAME:-zook}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"
REPO_NAME="${APP_NAME}-web"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REPO_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

if ! aws ecr describe-repositories --region "${REGION}" --repository-names "${REPO_NAME}" >/dev/null 2>&1; then
  aws ecr create-repository \
    --region "${REGION}" \
    --repository-name "${REPO_NAME}" \
    --image-scanning-configuration scanOnPush=true >/dev/null
  aws ecr put-lifecycle-policy \
    --region "${REGION}" \
    --repository-name "${REPO_NAME}" \
    --lifecycle-policy-text '{
      "rules": [
        {
          "rulePriority": 1,
          "description": "Keep only the newest 10 images",
          "selection": {
            "tagStatus": "any",
            "countType": "imageCountMoreThan",
            "countNumber": 10
          },
          "action": { "type": "expire" }
        }
      ]
    }' >/dev/null
fi

aws ecr get-login-password --region "${REGION}" |
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

docker buildx build \
  --platform linux/arm64 \
  --tag "${REPO_URI}:${TAG}" \
  --tag "${REPO_URI}:latest" \
  --push \
  .

aws ecr describe-repositories \
  --region "${REGION}" \
  --repository-names "${REPO_NAME}" \
  --query 'repositories[0].{repositoryUri:repositoryUri,repositoryArn:repositoryArn}' \
  --output json
