import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { clubId } = event.pathParameters || {};
    const language = event.queryStringParameters?.language;

    // Check if `clubId` is provided
    if (!clubId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "clubId is required" }),
      };
    }

    // Get the club data from DynamoDB
    const clubData = await ddbClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: parseInt(clubId) },
      })
    );

    if (!clubData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Club not found" }),
      };
    }

    const club = clubData.Item;

    // If no language parameter is provided, return the club as is
    if (!language) {
      return {
        statusCode: 200,
        body: JSON.stringify({ data: club }),
      };
    }

    // Check if the translation already exists in the cache
    const translations = club.translationCache || {};
    if (!translations[language]) {
      // Translate the club name if it's not found in cache
      const translationResult = await translateClient.send(
        new TranslateTextCommand({
          Text: club.name,
          SourceLanguageCode: 'en',
          TargetLanguageCode: language,
        })
      );
      const translatedName = translationResult.TranslatedText || '';

      // Cache the translated name in DynamoDB
      const updatedTranslations = { ...translations, [language]: { name: translatedName } };
      await ddbClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: { id: parseInt(clubId) },
          UpdateExpression: "set translationCache = :translations",
          ExpressionAttributeValues: { ":translations": updatedTranslations },
        })
      );

      // Update the club object with the new translation
      club.translationCache = updatedTranslations;
    }

    // Return the club with the translated name
    const responseClub = { ...club, name: club.translationCache[language]?.name || club.name };
    return {
      statusCode: 200,
      body: JSON.stringify({ data: responseClub }),
    };
  } catch (error) {
    console.error("Error translating club:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error }),
    };
  }
};
