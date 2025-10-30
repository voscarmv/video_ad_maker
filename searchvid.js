import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';
import axios from 'axios';

const client = createClient(process.env.PEXELS_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const messages = [];

const tools = [
    {
        type: 'function',
        function: {
            name: 'searchVids',
            description: 'Search video clips.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query',
                    }
                },
                required: ['query']
            }
        }
    },
];

const functions = {
    searchVids: (params) => {
        const { query } = params;
        const vids = query;
        return [vids];
    },
};

messages.push({
    role: 'developer',
    content: ''
})