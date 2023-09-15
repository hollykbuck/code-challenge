import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from 'nanoid'
const REGION = process.env.REGION
const TABLE = process.env.TABLE
const BUCKET = process.env.BUCKET

export const handler = async (event) => {
    const data = JSON.parse(event.body)
    const dbclient = new DynamoDBClient({
        region: REGION
    })
    const docClient = DynamoDBDocumentClient.from(dbclient)
    const command2 = new PutCommand({
        TableName: TABLE,
        Item: {
            "id": nanoid(),
            "input_text": data.inputText,
            "input_file_path": `${BUCKET}/${data.inputFilePath}`
        }
    })
    const resp = await docClient.send(command2)
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello from Lambda!',
            payload: ""
        }),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
    };
    return response;
};
