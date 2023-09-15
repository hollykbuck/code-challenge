# Welcome to Code Challenge CDK Project Part

## Deploy

Before deployment, you have to make sure that you have installed the following:
1. aws cli (`aws configure` your IAM account, your account should have enough permission to create resources in AWS)
2. nodejs 18


First Step: 
```
npm install --prefix dep
```

Second Step:
```
cdk synth
cdk boostrap
cdk deploy
``````

## Project Structure

This project is a part of the Code Challenge CDK Project. It contains the following:
1. lib/hellocdk-stack.ts contains the CDK stack definition
2. lib/hellocdk.ts is the entry point of the CDK app
3. public folder contains the static web content. 
4. dep folder contains the lambda function dependencies layer
5. script folder contains the script which will be evaluated in EC2 instance
6. resources folder contains the lambda function code

## Goals

- [x] Use AWS CDK to manage AWS infrastructure (latest version)
- [x] Use AWS SDK JavaScript V3 for Lambda (latest version, not V2)
- [x] Do not put any AWS access key / credentials in your code, nor environment,  nor config.
- [x] No SSH and no hard-coded parameters.
- [x] Your parameter/variable names are reader-friendly.
- [x] Your txt file in S3 is not public.
- [x] Do not use any AWS Amplify frontend and backend resources.
- [x] Follow the AWS Best Practices.
- [x] After saving the inputs and S3 path in DynamoDB FileTable, your system will create a new VM (not a pre-provisioned VM) and trigger the script to run automatically with error handling.

In addition

- [x] Your frontend code is hosted in S3 or Amplify (not backend)
- [x] Use Flowbite TailwindCSS and ReactJS for Responsive UI
