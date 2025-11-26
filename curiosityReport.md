# AWS CLI Automation: Deep Dive into Command-Line Cloud Management

## Overview

The AWS Command Line Interface (CLI) is a powerful tool that enables developers and DevOps engineers to interact with AWS services through the command line instead of going through the many UI pages. This can be used to automate (which is so great) and make lots of setup easier especially with tools like SAM CLI.

I learned of these tools throught CS 340 and thought it was interesting not using them in CS 329, of course going though and setting stup up manually helps us understand it.

## AWS CLI History and Evolution

The AWS CLI was first released in 2013 as a unified tool to manage AWS services. Prior to its release, developers had to use service-specific tools or the AWS Management Console for most operations. The CLI has evolved significantly:

- **v1 (2013-2022)**: Initial release with Python-based implementation
- **v2 (2020-present)**: Complete rewrite in Rust for better performance, improved installation experience, and enhanced features
- **Key improvements in v2**: 
  - Faster command execution (up to 2x faster)
  - Built-in auto-prompt for interactive command building
  - Improved credential handling with SSO support
  - Better output formatting options (JSON, YAML, table, text)

## Core Automation Concepts

### 1. Scripting with AWS CLI

The AWS CLI excels in shell scripting environments. A typical automation script might look like this:

```bash
#!/bin/bash
# Automated S3 backup script

BUCKET_NAME="my-backup-bucket"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/data"

# Create backup archive
tar -czf /tmp/backup_${TIMESTAMP}.tar.gz ${BACKUP_DIR}

# Upload to S3 with metadata
aws s3 cp /tmp/backup_${TIMESTAMP}.tar.gz \
  s3://${BUCKET_NAME}/backups/ \
  --metadata "timestamp=${TIMESTAMP},source=${HOSTNAME}"

# Verify upload
if aws s3 ls s3://${BUCKET_NAME}/backups/backup_${TIMESTAMP}.tar.gz; then
  echo "Backup successful"
  rm /tmp/backup_${TIMESTAMP}.tar.gz
else
  echo "Backup failed!"
  exit 1
fi
```

### 2. Output Formatting and Parsing

One of the most powerful features for automation is the ability to control output format:

```bash
# JSON output for programmatic parsing
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' --output json

# Table output for human-readable reports
aws ec2 describe-instances --output table

# Text output for simple scripts
aws s3 ls s3://my-bucket/ --output text | awk '{print $4}'
```

### 3. Credential Management and Profiles

For automation, managing credentials securely is critical:

```bash
# Using named profiles
aws s3 ls --profile production

# Using environment variables
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-east-1

# Using IAM roles (for EC2 instances)
# Credentials automatically retrieved from instance metadata
```

### 4. Error Handling in Scripts

This is an example of error handling using scripts for AWS CLI. When automating it is important to understand when something goes wrong because it is all happening without you manually doing it.

```bash
#!/bin/bash
set -e  # Exit on error

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Please install it first."
    exit 1
fi

# Verify credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "AWS credentials not configured"
    exit 1
fi

# Perform operation with error checking
if aws s3 cp file.txt s3://my-bucket/; then
    echo "Upload successful"
else
    echo "Upload failed with exit code $?"
    exit 1
fi
```

## Advanced Automation Patterns

### 1. Infrastructure as Code Integration

AWS CLI can complement Infrastructure as Code tools:

```bash
# Deploy CloudFormation stack
aws cloudformation create-stack \
  --stack-name my-app \
  --template-body file://template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=prod

# Wait for stack creation
aws cloudformation wait stack-create-complete --stack-name my-app

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name my-app \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 2. CI/CD Pipeline Integration

In CI/CD pipelines, AWS CLI enables automated deployments:

```bash
# Example from GitHub Actions (as seen in jwt-pizza project)
- name: Deploy to S3
  run: |
    aws s3 cp dist s3://${{ secrets.APP_BUCKET }} --recursive
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.DISTRIBUTION_ID }} \
      --paths "/*"
```

### 3. Batch Operations

The CLI excels at batch operations becuase there is no need to repeatedly go through UI.

```bash
# Delete all objects in a bucket prefix
aws s3 rm s3://my-bucket/prefix/ --recursive

# Tag multiple resources
for instance_id in $(aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=dev" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text); do
  aws ec2 create-tags \
    --resources $instance_id \
    --tags Key=Backup,Value=Required
done
```

### 4. Monitoring and Alerting Automation

Alarms like this could be good for checking to make sure everything is working properly.

```bash
# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-names "HighCPUUtilization" \
  --query 'MetricAlarms[0].StateValue' \
  --output text

# Create custom metrics
aws cloudwatch put-metric-data \
  --namespace CustomMetrics \
  --metric-name ApplicationErrors \
  --value 5 \
  --unit Count
```

## Tips and Tricks

### 1. Using JMESPath for Complex Queries

JMESPath is a query language built into the AWS CLI that allows you to perform advanced filtering and transformation on JSON output directly from your command line. You can pull out exactly the data you need without extra scripting. This is especially useful when dealing with large, nested AWS responses.

```bash
# Find all running instances with their names
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# Get the latest Amazon Linux 2 AMI ID
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text
```


### 2. Dry Run Operations

Perform a "dry run" to test operations without making any actual changes. This is useful for validating commands, checking permissions, and ensuring correct parameters before executing potentially impactful actions.

```bash
# Dry run for S3 operations
aws s3 cp file.txt s3://my-bucket/ --dryrun

# Simulate EC2 instance launch
aws ec2 run-instances \
  --image-id ami-12345678 \
  --instance-type t2.micro \
  --dry-run
```


## Benefits of AWS CLI Automation

### 1. **Reproducibility**
Scripts ensure consistent operations across environments and team members.

### 2. **Speed and Efficiency**
CLI operations are faster than manual console clicks, especially for batch operations.

### 3. **Integration**
Easy integration with shell scripts, CI/CD pipelines, and other automation tools.

### 4. **Error Reduction**
Automated scripts reduce human error in repetitive tasks.

## Real-World Use Cases

### 1. Automated Backup and Disaster Recovery

```bash
#!/bin/bash
# Automated EBS snapshot script

INSTANCE_ID="i-1234567890abcdef0"
VOLUME_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
  --output text)

SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "Automated backup $(date +%Y-%m-%d)" \
  --query 'SnapshotId' \
  --output text)

echo "Created snapshot: $SNAPSHOT_ID"

# Tag the snapshot
aws ec2 create-tags \
  --resources $SNAPSHOT_ID \
  --tags Key=BackupType,Value=Automated Key=Date,Value=$(date +%Y-%m-%d)
```

### 2. Cost Monitoring and Reporting

```bash
#!/bin/bash
# Generate cost report

START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

aws ce get-cost-and-usage \
  --time-period Start=${START_DATE},End=${END_DATE} \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --query 'ResultsByTime[*].[TimePeriod.Start,Total.BlendedCost.Amount]' \
  --output table
```

## AWS SAM CLI: Serverless Application Automation

The AWS Serverless Application Model (SAM) CLI is a powerful extension of AWS CLI capabilities specifically designed for building, testing, and deploying serverless applications. While AWS CLI provides general-purpose cloud management, SAM CLI focuses on the serverless development lifecycle, making it an essential tool for Lambda functions, API Gateway, and other serverless services. We used this in CS340 and found it very useful.

### What is SAM CLI?

SAM CLI is built on top of AWS CLI and CloudFormation, providing a simplified workflow for serverless applications. It uses the SAM template specification (an extension of CloudFormation) to define serverless resources in a more concise way than raw CloudFormation templates.

### SAM CLI vs AWS CLI for Serverless

While AWS CLI can manage Lambda functions directly, SAM CLI provides a more streamlined experience:

**AWS CLI approach:**
```bash
# Package Lambda function
zip function.zip lambda_function.py

# Upload to S3
aws s3 cp function.zip s3://my-bucket/

# Create Lambda function
aws lambda create-function \
  --function-name my-function \
  --runtime python3.9 \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --handler lambda_function.handler \
  --code S3Bucket=my-bucket,S3Key=function.zip

# Create API Gateway (many more commands...)
```

**SAM CLI approach:**
```bash
# One command to build and deploy everything
sam build && sam deploy
```


### Integration with AWS CLI

SAM CLI uses AWS CLI under the hood, so all AWS CLI features are available:

```bash
# Use AWS CLI profiles with SAM
sam deploy --profile production

# Use AWS CLI environment variables
export AWS_PROFILE=production
sam deploy

# Combine SAM CLI with AWS CLI for advanced workflows
sam deploy
STACK_NAME=$(sam list stack-outputs --stack-name my-app --output json | jq -r '.StackName')
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)
echo "API deployed at: $ENDPOINT"
```

### Limitations and Considerations

- **Serverless Focus**: SAM CLI is optimized for serverless, so this wouldn't work too well for JWT-Pizza, but good for CS340
- **CloudFormation Dependency**
- **Learning Curve**: Requires understanding of SAM template syntax


## Comparison with Other Tools

While AWS CLI is powerful, it's often used alongside other tools:

- **Terraform**: Infrastructure provisioning (declarative)
- **AWS SDKs**: Application-level integration
- **AWS CDK**: Infrastructure as code using programming languages
- **AWS SAM CLI**: Serverless application development and deployment (extends AWS CLI)
- **AWS Console**: Manual operations and exploration

The CLI excels at operational tasks, quick scripts, and CI/CD integration where programmatic access is needed. SAM CLI complements AWS CLI by providing serverless-specific workflows, local development capabilities, and simplified deployment processes for Lambda-based applications.

## Conclusion

AWS CLI automation represents a critical skill for modern DevOps engineers. Beyond basic command execution, the CLI offers powerful features for scripting, batch operations, and integration into larger automation workflows. The combination of JMESPath queries, output formatting options, and robust error handling makes it an indispensable tool for cloud operations.

As cloud infrastructure becomes more complex, the ability to automate routine operations through the AWS CLI (and SAM CLI for serverless) becomes increasingly valuable, enabling teams to focus on higher-level tasks while ensuring consistency, reliability, and efficiency in cloud operations. The combination of these tools provides a comprehensive automation toolkit that covers both traditional infrastructure management and modern serverless architectures.

## References

1. AWS CLI User Guide: https://docs.aws.amazon.com/cli/latest/userguide/
2. AWS CLI Command Reference: https://docs.aws.amazon.com/cli/latest/reference/
3. AWS SAM CLI Documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
4. AWS SAM Specification: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification.html
5. JMESPath Tutorial: https://jmespath.org/tutorial.html
6. AWS CLI GitHub Repository: https://github.com/aws/aws-cli
7. AWS SAM CLI GitHub Repository: https://github.com/aws/aws-sam-cli
8. AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
9. AWS Security Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
