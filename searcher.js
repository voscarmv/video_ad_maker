import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs'; 

const client = createClient(process.env.PEXELS_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

const tools = [
    {
        type: 'function',
        function: {
            name: 'searchVids',
            description: 'Search video clips. Returns search results.',
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
    {
        type: 'function',
        function: {
            name: 'searchMusic',
            description: 'Search background music clips. Returns search results.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'A few keywords (1 to 3+, the fewer the more results) describing the kind of music to search.',
                    },
                    tags: {
                        type: 'array',
                        description: 'Single-word tags to look for, these can be mood, genre, etc.',
                        items: {
                            type: 'string'
                        }
                    }
                },
                required: ['query', 'tags']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'downloadVid',
            description: 'Download a video file. Returns downloaded file path and its description.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL of the video',
                    },
                    file_type: {
                        type: 'string',
                        description: 'File format for the resulting filename, e.g. mp4, avi, etc...',
                    },
                    description: {
                        type: 'string',
                        description: 'Video description'
                    }
                },
                required: ['url']
            }
        }
    },
];

const functions = {
    searchVids: async (params) => {
        const { query } = params;
        const vids = await client.videos.search({
            query,
            per_page: 3,
            orientation: 'square',
            size: 'small'
        });
        // return vids;
        const videos = [];
        for (let i = 0; i < vids.videos.length; i++) {
            const response = await axios.get(vids.videos[i].image, {
                responseType: 'arraybuffer',  // Get response as buffer
            });
            const buffer = Buffer.from(response.data);
            const options = {
                maxWidth: 512,
                maxHeight: 512,
                quality: 80,
                format: 'jpeg'
            };
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
            const messages = [];
            messages.push(
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Describe this video thumbnail'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: dataUri,
                                detail: 'low'
                            }
                        }
                    ]
                }
            );
            const completion = await openai.chat.completions.create({
                messages,
                model: "gpt-4o-mini",
            });

            videos.push({
                downloadlink: vids.videos[i].video_files[0].link,
                type: vids.video[i].video_files[0].file_type,
                thumbnail: vids.videos[i].image,
                description: completion.choices[0].message.content
            });
        }
        return JSON.stringify(videos);
    },
    searchMusic: async (params) => {
        const { query, tags } = params;
        const t = '';
        for (let i = 0; i < tags.length; i++) {
            t = `${t} tag:${tags[i]}`
        }
        const refresh = await readFile('./.env.refresh', 'utf8');
        const data = new URLSearchParams({
            client_id: process.env.FREESOUND_CLIENT_ID,
            client_secret: process.env.FREESOUND_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: refresh,
        });
        const response = await axios.post(
            "https://freesound.org/apiv2/oauth2/access_token/",
            data
        );
        console.log(response.data);
        await writeFile('./.env.refresh', response.data.refresh_token, 'utf8');
        const searchResult = await axios.get('https://freesound.org/apiv2/search/text/',
            {
                params: {
                    query,
                    page_size: 5,
                    filter: `category:Music ${t}`,
                    fields: 'id,url,type,download,avg_rating,name,tags,description,duration'
                },
                headers: {
                    Authorization: `Bearer ${response.data.access_token}`
                }
            }
        );
        return JSON.stringify(searchResult.data.results);
    },
    downloadVid: async (params) => {
        const { url, type } = params;
        // const
    }
};

const messages = [];
messages.push({
    role: 'system',
    content: 'You process video thumbnails'
});

(async () => {
    const vids = await functions['searchVids']({ query: 'relaxing nature' });
    console.log(vids);
})();


