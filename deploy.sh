#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <cloudformation-stack-name> [region]"
  exit 1
fi

STACK_NAME="$1"
REGION="${2:-us-east-1}"

get_output() {
  local key="$1"
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]" \
    --output text
}

get_parameter() {
  local key="$1"
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Parameters[?ParameterKey=='${key}'].ParameterValue | [0]" \
    --output text
}

BUCKET_NAME="$(get_output FrontendBucketName)"
DISTRIBUTION_ID="$(get_output CloudFrontDistributionId)"
STOREFRONT_URL="$(get_output StorefrontUrl)"
DOMAIN_NAME="$(get_parameter DomainName)"
SECONDARY_DOMAIN_NAME="$(get_parameter SecondaryDomainName)"
CERTIFICATE_ARN="$(get_parameter CertificateArn)"

if { [ -n "$DOMAIN_NAME" ] || [ -n "$SECONDARY_DOMAIN_NAME" ]; } && [ -z "$CERTIFICATE_ARN" ]; then
  echo "Error: stack is configured with custom domain(s) but CertificateArn is empty."
  echo "A valid ACM certificate in us-east-1 is required for HTTPS on every custom storefront domain."
  echo "Make sure your certificate covers both '$DOMAIN_NAME' and '$SECONDARY_DOMAIN_NAME'."
  exit 1
fi

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" = "None" ]; then
  echo "Could not find FrontendBucketName output for stack: $STACK_NAME"
  exit 1
fi

aws s3 sync . "s3://$BUCKET_NAME" \
  --region "$REGION" \
  --delete \
  --exclude "deploy.sh"

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" >/dev/null
fi

echo "Frontend deployed to S3 bucket: $BUCKET_NAME"
echo "CloudFront distribution: $DISTRIBUTION_ID"
echo "Storefront URL: $STOREFRONT_URL"
