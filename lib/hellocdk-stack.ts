import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
const REGION = "ap-southeast-1"
const SCRIPTFILE = "script/exe.sh"

export class BusinessLogicService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const depLayer = new lambda.LayerVersion(this, 'dep', {
      code: lambda.Code.fromAsset('dep'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
    });
    const bucket = new s3.Bucket(this, 'shania');
    new s3deploy.BucketDeployment(this, 'DeployScript', {
      sources: [s3deploy.Source.asset('script')],
      destinationBucket: bucket,
      destinationKeyPrefix: 'script',
    });
    bucket.addCorsRule({
      allowedMethods: [
        s3.HttpMethods.PUT,
      ],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
    });
    
    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess',
        },
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        }
      ],
    });
    const profile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [role.roleName],
    });
    const table = new dynamodb.Table(this, 'FileTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true }),
      allowAllOutbound: true,
    });
    const submitHandler = new lambda.Function(this, 'submit', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('resources'),
      handler: 'submit.handler',
      environment: {
        BUCKET: bucket.bucketName,
        TABLE: table.tableName,
        REGION: REGION,
      },
      layers: [depLayer],
    });
    const presignedHandler = new lambda.Function(this, 'presigned', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('resources'),
      handler: 'presigned.handler',
      environment: {
        BUCKET: bucket.bucketName,
        REGION: REGION,
      },
      layers: [depLayer],
    });
    const executeHandler = new lambda.Function(this, 'exe', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('resources'),
      handler: 'exe.handler',
      environment: {
        BUCKET: bucket.bucketName,
        TABLE: table.tableName,
        SECURITY_GROUP: securityGroup.securityGroupId,
        REGION: REGION,
        IAMROLE: profile.attrArn,
        SCRIPTFILE: SCRIPTFILE,
      },
      layers: [depLayer],
    });
    bucket.grantReadWrite(submitHandler);
    table.grantFullAccess(submitHandler);
    bucket.grantReadWrite(presignedHandler);
    bucket.grantReadWrite(executeHandler);
    table.grantFullAccess(executeHandler);
    // dynamodb trigger
    executeHandler.role?.addManagedPolicy(
      {
        managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole"
      }
    )
    executeHandler.role?.addManagedPolicy(
      {
        managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
      }
    )
    executeHandler.addEventSourceMapping('trigger', {
      eventSourceArn: table.tableStreamArn,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 1,
    });
    const api = new apigateway.RestApi(this, 'file', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
    });
    const submitAPI = api.root.addResource('submit');
    const submitIntegration = new apigateway.LambdaIntegration(submitHandler);
    submitAPI.addMethod('POST', submitIntegration);
    const presignedAPI = api.root.addResource('presigned');
    const presignedIntegration = new apigateway.LambdaIntegration(presignedHandler);
    presignedAPI.addMethod('POST', presignedIntegration);
    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['iam:PassRole'],
      resources: ["*"],
    });
    executeHandler.addToRolePolicy(policy);
    const staticWebsiteBucket = new s3.Bucket(this, 'staticWebsiteBucket', {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
    });
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('public'), s3deploy.Source.jsonData('config.json', {
        "url": api.url
      })],
      destinationBucket: staticWebsiteBucket,
    });
    console.log("Static Website URL: ", staticWebsiteBucket.bucketWebsiteUrl)
  }
}

export class BusinessLogicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new BusinessLogicService(this, 'BusinessLogicService');
  }
}
