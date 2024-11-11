import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    const parameters = event?.pathParameters;
    const clubId = parameters?.clubId ? parseInt(parameters.clubId) : undefined;
    const includePlayers = event?.queryStringParameters?.players === "true";

    if (!clubId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing club Id" }),
      };
    }

    // Fetch club metadata
    const clubCommandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: clubId },
      })
    );

    if (!clubCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid club Id" }),
      };
    }

    let responseBody: any = { data: clubCommandOutput.Item };

    if (includePlayers) {
      const playersCommandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.PLAYERS_TABLE_NAME,
          KeyConditionExpression: "clubId = :c",
          ExpressionAttributeValues: {
            ":c": clubId,
          },
        })
      );

      responseBody.players = playersCommandOutput.Items || [];
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(responseBody),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
