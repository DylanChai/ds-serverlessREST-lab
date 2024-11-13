import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { clubs, clubPlayers } from "../seed/clubs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ClubAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool setup
    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });
    const userPoolId = userPool.userPoolId;
    const userPoolClientId = appClient.userPoolClientId;

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    // DynamoDB tables for clubs and players
    const clubsTable = new dynamodb.Table(this, "ClubsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Clubs",
    });

    const clubPlayersTable = new dynamodb.Table(this, "ClubPlayersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "clubId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "playerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "ClubPlayers",
    });

    clubPlayersTable.addLocalSecondaryIndex({
      indexName: "positionIx",
      sortKey: { name: "position", type: dynamodb.AttributeType.STRING },
    });

    // Lambda functions for Clubs and ClubPlayers
    const getClubByIdFn = new lambdanode.NodejsFunction(this, "GetClubByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getClubById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        PLAYER_TABLE_NAME: clubPlayersTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const getAllClubsFn = new lambdanode.NodejsFunction(this, "GetAllClubsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllClubs.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const translateClubFn = new lambdanode.NodejsFunction(this, "TranslateClubFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/translateClub.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Grant permissions to use Amazon Translate
    translateClubFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
    }));

    // API Gateway setup
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Club and Player API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const authorizer = new apig.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool],
    });

    const clubsEndpoint = api.root.addResource("clubs");
    clubsEndpoint.addMethod("GET", new apig.LambdaIntegration(getAllClubsFn), {
      authorizer,
      authorizationType: apig.AuthorizationType.COGNITO,
    });

    const clubEndpoint = clubsEndpoint.addResource("{clubId}");

    const translateClubEndpoint = clubEndpoint.addResource("translate");
    translateClubEndpoint.addMethod("GET", new apig.LambdaIntegration(translateClubFn), {
      authorizer,
      authorizationType: apig.AuthorizationType.COGNITO,
    });

    // Additional permissions and configuration as needed
    clubsTable.grantReadData(getClubByIdFn);
    clubsTable.grantReadData(getAllClubsFn);
    clubsTable.grantReadData(translateClubFn);
  }
}
