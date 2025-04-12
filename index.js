require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const AWS = require('aws-sdk');
const OpenAI = require('openai');
const { OPENAI_API_KEY } = process.env;
const app = express();


const PORT = process.env.PORT
const greetingMessage = process.env.GREETING_MESSAGE

app.get('/', async (req, res) => {

    const userPrompt = greetingMessage
    const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'user', content: userPrompt }],
    });


    res.json({ reply: response.choices[0].message.content });
});

app.post('/', (req, res) => {
    const body = JSON.stringify(req.body);
    res.send(JSON.stringify(body));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});