#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BusinessLogicStack } from '../lib/hellocdk-stack';

const app = new cdk.App();
new BusinessLogicStack(app, 'HellocdkStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});