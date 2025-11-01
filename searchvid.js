import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';
import axios from 'axios';
import sharp from 'sharp';

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
        const vidsearch = await client.videos.search({ query, per_page: 5 });
        return vidsearch;
    },
};

messages.push({
    role: 'system',
    content: 'You process images'
});

async function msgContent(videos) {
    const content = [];
    const options = {
        maxWidth: 512,
        maxHeight: 512,
        quality: 80,
        format: 'jpeg'
    };
    for (let i = 0; i < videos.length && i < 5; i++) {
        const response = await axios.get(videos[i].image, {
            responseType: 'arraybuffer',  // Get response as buffer
        });
        const buffer = Buffer.from(response.data);
        const compressed = await sharp(buffer)
            .resize(options.maxWidth, options.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFormat(options.format, {
                quality: options.quality,
                mozjpeg: true
            })
            .toBuffer();
        const base64 = compressed.toString('base64');
        const dataUri = `data:image/${options.format};base64,${base64}`;
        content.push({
            type: 'image_url',
            image_url: {
                url: dataUri,
                detail: 'low'
            }
        })
    }
    return content;
}

(async () => {
    const vids = await functions['searchVids']({ query: 'relaxing nature' });
    // console.log(vids.videos[2].image);
    // const response = await axios.get(vids.videos[2].image, {
    //     responseType: 'arraybuffer',  // Get response as buffer
    // });
    // const buffer = Buffer.from(response.data);
    // const options = {
    //     maxWidth: 512,
    //     maxHeight: 512,
    //     quality: 80,
    //     format: 'jpeg'
    // };
    // const compressed = await sharp(buffer)
    //     .resize(options.maxWidth, options.maxHeight, {
    //         fit: 'inside',
    //         withoutEnlargement: true
    //     })
    //     .toFormat(options.format, {
    //         quality: options.quality,
    //         mozjpeg: true
    //     })
    //     .toBuffer();
    // const base64 = compressed.toString('base64');
    // const dataUri = `data:image/${options.format};base64,${base64}`;
    const content = await msgContent(vids);
    content.unshift({
        type: 'text',
        text: 'Describe these images'
    })
    messages.push(
        {
            role: 'user',
            content
        }
    );
    const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-4o",
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: 'image_descriptions',
                schema: {
                    type: "object",
                    properties: {
                        descriptions: {
                            type: "array",
                            description: "Ordered array of descriptions of the images",
                            items: {
                                description: "The description of an image",
                                type: "string"
                            }
                        }
                    }
                }
            }
        }
    });
    console.log(completion.choices[0].message.content);
})();


