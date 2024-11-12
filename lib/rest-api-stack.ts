import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { clubs, clubPlayers } from "../seed/clubs"; // Updated import for seed data
import * as apig from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api'

export class ClubAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
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

    // Define tables for clubs and players
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

    // Define Lambda functions for Clubs and ClubPlayers
    const getClubByIdFn = new lambdanode.NodejsFunction(this, "GetClubByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getClubById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        PLAYER_TABLE_NAME: clubPlayersTable.tableName, // Reference the players table
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

    const getClubPlayersFn = new lambdanode.NodejsFunction(this, "GetClubPlayersFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getClubPlayer.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubPlayersTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const addClubFn = new lambdanode.NodejsFunction(this, "AddClubFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addClub.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const deleteClubFn = new lambdanode.NodejsFunction(this, "DeleteClubFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/deleteClub.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Populate the DynamoDB tables
    new custom.AwsCustomResource(this, "clubsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [clubsTable.tableName]: generateBatch(clubs),
            [clubPlayersTable.tableName]: generateBatch(clubPlayers), // Include player data
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("clubsddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [clubsTable.tableArn, clubPlayersTable.tableArn],
      }),
    });

    // Permissions
    clubsTable.grantReadData(getClubByIdFn);
    clubsTable.grantReadData(getAllClubsFn);
    clubsTable.grantReadWriteData(addClubFn);
    clubsTable.grantReadWriteData(deleteClubFn);
    clubPlayersTable.grantReadData(getClubPlayersFn);

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

    const clubsEndpoint = api.root.addResource("clubs");

    // GET /clubs
    clubsEndpoint.addMethod("GET", new apig.LambdaIntegration(getAllClubsFn, { proxy: true }));

    // /clubs/{clubId}
    const clubEndpoint = clubsEndpoint.addResource("{clubId}");

    // GET /clubs/{clubId}
    clubEndpoint.addMethod("GET", new apig.LambdaIntegration(getClubByIdFn, { proxy: true }));

    // POST /clubs
    clubsEndpoint.addMethod("POST", new apig.LambdaIntegration(addClubFn, { proxy: true }));

    // DELETE /clubs/{clubId}
    clubEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteClubFn, { proxy: true }));

    // GET /clubs/{clubId}/players
    const clubPlayersEndpoint = clubEndpoint.addResource("players");
    clubPlayersEndpoint.addMethod("GET", new apig.LambdaIntegration(getClubPlayersFn, { proxy: true }));

    const authorizer = new apig.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool],
    });

    new apig.LambdaIntegration(getAllClubsFn, { proxy: true }),
    { authorizer, authorizationType: apig.AuthorizationType.COGNITO };

    new apig.LambdaIntegration(deleteClubFn, { proxy: true }),
          { authorizer, authorizationType: apig.AuthorizationType.COGNITO }

  }

  
}
