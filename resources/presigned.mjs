import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const REGION = process.env.REGION
const BUCKET = process.env.BUCKET
const s3Client = new S3Client({ region: REGION })
export const handler = async (event) => {
    const data = JSON.parse(event.body)
    const command1 = new PutObjectCommand({
        Bucket: BUCKET,
        Key: data.filename,
    })
    const result = await getSignedUrl(
        s3Client,
        command1,
        { expiresIn: 3600 }
    )
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            "url": result
        }),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
    };
    return response;
};
