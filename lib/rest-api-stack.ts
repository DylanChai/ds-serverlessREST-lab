import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
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

    // Lambda functions
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

    const addClubFn = new lambdanode.NodejsFunction(this, "AddClubFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
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
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteClub.ts`,
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

    const getClubPlayerFn = new lambdanode.NodejsFunction(this, "GetClubPlayerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getClubPlayer.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubPlayersTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Grant permissions to use Amazon Translate
    translateClubFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
    }));

    // Initialize API Gateway
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Club and Player API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const requestAuthorizer = new apig.RequestAuthorizer(this, "RequestAuthorizer", {
      handler: new lambdanode.NodejsFunction(this, "AuthorizerFn", {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
        environment: {
          USER_POOL_ID: userPoolId,
          CLIENT_ID: userPoolClientId,
          REGION: "eu-west-1",
        },
      }),
      identitySources: [apig.IdentitySource.header("cookie")],
      resultsCacheTtl: cdk.Duration.minutes(0),
    });

    const updateClubFn = new lambdanode.NodejsFunction(this, "UpdateClubFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/updateClub.ts`, // Ensure you create this file
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: clubsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Setup API resources
    const clubsEndpoint = api.root.addResource("clubs");

    // GET /clubs - Retrieve all clubs
    clubsEndpoint.addMethod("GET", new apig.LambdaIntegration(getAllClubsFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // POST /clubs - Add a new club
    clubsEndpoint.addMethod("POST", new apig.LambdaIntegration(addClubFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // /clubs/{clubId} - Get, Delete specific club
    const clubEndpoint = clubsEndpoint.addResource("{clubId}");

    // GET /clubs/{clubId} - Retrieve club by ID
    clubEndpoint.addMethod("GET", new apig.LambdaIntegration(getClubByIdFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // DELETE /clubs/{clubId} - Delete a club by ID
    clubEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteClubFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // /clubs/{clubId}/translate - Translate club name
    const translateClubEndpoint = clubEndpoint.addResource("translate");
    translateClubEndpoint.addMethod("GET", new apig.LambdaIntegration(translateClubFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    // /clubs/{clubId}/players - Retrieve players for a specific club
    const clubPlayerEndpoint = clubEndpoint.addResource("players");
    clubPlayerEndpoint.addMethod("GET", new apig.LambdaIntegration(getClubPlayerFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    translateClubFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["dynamodb:UpdateItem"],
      resources: [clubsTable.tableArn],
    }));
    
    // Add a PUT method for updating a specific club by ID
clubEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateClubFn), {
  authorizer: requestAuthorizer,
  authorizationType: apig.AuthorizationType.CUSTOM,
});


    // Permissions
    clubsTable.grantReadWriteData(addClubFn);
    clubsTable.grantReadWriteData(deleteClubFn);
    clubsTable.grantReadData(getClubByIdFn);
    clubsTable.grantReadData(getAllClubsFn);
    clubsTable.grantReadData(translateClubFn);
    clubPlayersTable.grantReadData(getClubPlayerFn);
    // Grant permissions for TranslateClubFn to update items in the Clubs table
clubsTable.grantWriteData(translateClubFn);
// Permissions for the TranslateClubFn function
clubsTable.grantReadData(translateClubFn);
clubsTable.grantWriteData(translateClubFn); //Updating permissions
clubsTable.grantReadWriteData(translateClubFn);
clubsTable.grantReadWriteData(updateClubFn);

  }
}
