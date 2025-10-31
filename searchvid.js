import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';

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
                        description: 'For example your query could be something broad like Nature, Tigers, People. Or it could be something specific like Group of people working.',
                    }
                },
                required: ['query']
            }
        }
    },
];

const functions = {
    searchVids: async (params) => {
        const { query } = params;
        const vidsearch = await client.videos.search({ query, per_page: 1 });
        return vidsearch;
    },
};

messages.push({
    role: 'system',
    content: ''
})