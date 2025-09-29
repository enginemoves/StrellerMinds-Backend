#!/bin/bash

# S3 LocalStack Configuration Script
# This script configures S3 buckets and policies for local development

set -e

echo "🚀 Configuring LocalStack S3 for StrellerMinds development..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health > /dev/null; do
    echo "Waiting for LocalStack..."
    sleep 2
done

echo "✅ LocalStack is ready!"

# Configure AWS CLI for LocalStack using Docker
AWS_CMD="docker run --rm --network strellerminds-network -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_DEFAULT_REGION=us-east-1 amazon/aws-cli:2.13.0 --endpoint-url=http://localstack:4566"

# Create S3 bucket
echo "📦 Creating S3 bucket..."
$AWS_CMD s3 mb s3://strellerminds-dev-storage || echo "Bucket might already exist"

# Configure CORS for the bucket
echo "🔧 Configuring CORS policy..."
$AWS_CMD s3api put-bucket-cors \
    --bucket strellerminds-dev-storage \
    --cors-configuration '{
        "CORSRules": [{
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }]
    }'

# Create a test file to verify S3 is working
echo "🧪 Testing S3 upload..."
echo "Hello from StrellerMinds LocalStack!" | $AWS_CMD s3 cp - s3://strellerminds-dev-storage/test.txt

echo "✅ S3 configuration complete!"
echo "📋 Bucket: strellerminds-dev-storage"
echo "🌐 Endpoint: http://localhost:4566"
echo "🔗 Test file: http://localhost:4566/strellerminds-dev-storage/test.txt"
