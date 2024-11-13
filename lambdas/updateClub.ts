import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const validateClubUpdate = ajv.compile(schema.definitions["ClubUpdate"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const clubId = event.pathParameters?.clubId;
    const body = event.body ? JSON.parse(event.body) : null;

    if (!clubId || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing club ID or request body" }),
      };
    }

    // Validate request body with ClubUpdate schema
    if (!validateClubUpdate(body)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Request body does not match Club schema for updates",
          schema: schema.definitions["ClubUpdate"],
        }),
      };
    }

    await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: Number(clubId) },
        UpdateExpression: "SET #name = :name, #city = :city, #year_founded = :year_founded",
        ExpressionAttributeNames: {
          "#name": "name",
          "#city": "city",
          "#year_founded": "year_founded",
        },
        ExpressionAttributeValues: {
          ":name": body.name,
          ":city": body.city,
          ":year_founded": body.year_founded,
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Club updated successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update club", error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
