import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Create DynamoDB client
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "movieId is required in the path" }),
      };
    }

    const deleteCommand = new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: Number(movieId) },  // Make sure to convert movieId to a number
    });

    await ddbDocClient.send(deleteCommand);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: `Movie with ID ${movieId} deleted successfully` }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Failed to delete movie", error: error.message }),
    };
  }
};

// Helper function to create DynamoDB DocumentClient
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
