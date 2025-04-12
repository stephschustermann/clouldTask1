import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    QueryCommand,
    PutCommand
} from '@aws-sdk/lib-dynamodb';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const { OPENAI_API_KEY } = process.env;
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

const TABLE_NAME = 'chat-history';
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});


export const handler = async (event) => {
    if (event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: "OPTIONS request headers"
        };
    }

    if (event.requestContext.http.method !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({
                error: 'Received a non-supported method. Please use POST method',
            }),
        };
    }

    const body = JSON.parse(event.body);
    const userPrompt = body.user_prompt;
    const userId = body.user_id || `guest_${uuidv4()}`;
    const now = Date.now();

    if (!userPrompt) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing message content' })
        };
    }

    const recentMessages = await docClient.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'user_id = :uid',
            ExpressionAttributeValues: {
                ':uid': userId
            },
            ScanIndexForward: false,
            Limit: 6
        })
    );

    const serializedMessages = recentMessages.Items?.map((msg) => ({
        role: msg.role,
        content: msg.content
    })).reverse() || [];

    serializedMessages.push({ role: 'user', content: userPrompt });

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: serializedMessages
    });

    const aiReply = completion.choices[0].message.content;

    const timestampUser = now;
    const timestampAI = now + 1; // ensure AI message comes after

    await Promise.all([
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    user_id: userId,
                    timestamp: timestampUser,
                    role: 'user',
                    content: userPrompt
                }
            })
        ),
        docClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    user_id: userId,
                    timestamp: timestampAI,
                    role: 'assistant',
                    content: aiReply
                }
            })
        )
    ]);

    return {
        statusCode: 200,
        body: JSON.stringify({
            ai_reply: aiReply,
            user_id: userId
        })
    };
};
