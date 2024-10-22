import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const validate = ajv.compile(schema.definitions["Movie"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    if (!validate(body)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Request body does not match Movie schema",
          schema: schema.definitions["Movie"],
        }),
      };
    }

    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: body,
      })
    );

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Movie added successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
