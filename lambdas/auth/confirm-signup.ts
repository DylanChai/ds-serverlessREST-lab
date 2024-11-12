import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ConfirmSignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import { ConfirmSignUpBody } from "../../shared/types";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(
  schema.definitions["ConfirmSignUpBody"] || {}
);
const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    const body = event.body ? JSON.parse(event.body) : undefined;
    
    // Validate body schema
    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,  // Use 400 for validation errors
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Invalid request body. Must match ConfirmSignUpBody schema.`,
          details: schema.definitions["ConfirmSignUpBody"],
        }),
      };
    }

    const confirmSignUpBody = body as ConfirmSignUpBody;
    
    // Setup Cognito confirmation parameters
    const params: ConfirmSignUpCommandInput = {
      ClientId: process.env.CLIENT_ID!,
      Username: confirmSignUpBody.username,
      ConfirmationCode: confirmSignUpBody.code,
    };

    // Execute the confirmation command
    const command = new ConfirmSignUpCommand(params);
    await client.send(command);

    // Success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `User ${confirmSignUpBody.username} successfully confirmed`,
        confirmed: true,
      }),
    };
  } catch (err) {
    console.error("Confirmation error:", err); // Log error for debugging
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err instanceof Error ? err.message : "Internal server error",
        details: err,
      }),
    };
  }
};
