import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(schema.definitions["ClubPlayerQueryParams"] || {});
const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const queryParams = event.queryStringParameters;
    const clubId = event.pathParameters?.clubId ? parseInt(event.pathParameters.clubId) : null;

    // Ensure clubId exists in the path parameters
    if (!clubId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing clubId in path parameters" }),
      };
    }

    // Validate query parameters (position, playerName) if they exist
    if (queryParams && !isValidQueryParams(queryParams)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: `Invalid query parameters. Must match ClubPlayerQueryParams schema.`,
          schema: schema.definitions["ClubPlayerQueryParams"],
        }),
      };
    }

    // Build the DynamoDB query command based on the query parameters
    let commandInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "clubId = :c",
      ExpressionAttributeValues: {
        ":c": clubId,
      },
    };

    if (queryParams?.position) {
      commandInput = {
        ...commandInput,
        IndexName: "positionIx", // Adjust index name if it’s for querying by position
        KeyConditionExpression: "clubId = :c and begins_with(position, :p)",
        ExpressionAttributeValues: {
          ":c": clubId,
          ":p": queryParams.position,
        },
      };
    } else if (queryParams?.playerName) {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "clubId = :c and begins_with(playerName, :n)",
        ExpressionAttributeValues: {
          ":c": clubId,
          ":n": queryParams.playerName,
        },
      };
    }

    // Execute query
    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: commandOutput.Items }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}
