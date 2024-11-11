import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ClubPlayerQueryParams } from "../shared/types";
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

    // Ensure queryParams has clubId
    if (!queryParams || !queryParams.clubId) {
      return {
        statusCode: 400, // Return 400 for missing clubId
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing clubId in query parameters" }),
      };
    }

    // Validate query parameters using AJV
    if (!isValidQueryParams(queryParams)) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Incorrect type. Must match Query parameters schema`,
          schema: schema.definitions["ClubPlayerQueryParams"],
        }),
      };
    }

    const clubId = parseInt(queryParams.clubId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
    };

    // Construct query command based on playerName or position
    if ("position" in queryParams) {
      commandInput = {
        ...commandInput,
        IndexName: "positionIx", // Adjust index name if it's specifically for querying by position
        KeyConditionExpression: "clubId = :c and begins_with(position, :p) ",
        ExpressionAttributeValues: {
          ":c": clubId,
          ":p": queryParams.position,
        },
      };
    } else if ("playerName" in queryParams) {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "clubId = :c and begins_with(playerName, :n) ",
        ExpressionAttributeValues: {
          ":c": clubId,
          ":n": queryParams.playerName,
        },
      };
    } else {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "clubId = :c",
        ExpressionAttributeValues: {
          ":c": clubId,
        },
      };
    }

    // Execute query
    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: commandOutput.Items }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = { wrapNumbers: false };
  return DynamoDBDocumentClient.from(ddbClient, { marshallOptions, unmarshallOptions });
}
