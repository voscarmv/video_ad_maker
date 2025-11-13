import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import { finished } from "stream/promises";
import { readFile, writeFile } from 'node:fs/promises';

const client = createClient(process.env.PEXELS_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

export const agents = {};

// const team = ['director', 'searcher'];

export const roles = `
The goal is to download 5 videos and 1 music file that match the theme of halloween.
Evaluate search results before downloading, and if necessary run multiple different searches before downloading to refine the choice.

These are the members of the team (agents)

Director: Directs the whole operation. Communicates with team members to reach the goal. Terminates the process when all is done.
Searcher: Can search and download videos and music files. Searcher can perform several consecutive searches, but musta always get back to the director once something worth showing is found. Searcher can also download multiple files consecutively, but again must always report back to the director in the end. If you have trouble finding videos, try broadening the search by using fewer keywords. Consider single-word search queries. Before downloading anything describe your findings to discuss what fits best.
`;

export function registerAgent(agent, send) {
    agents[agent] = {
        send
    }
}

export const tools = [
    {
        type: 'function',
        function: {
            name: 'sendMessage',
            description: 'Send a message to another agent.',
            parameters: {
                type: 'object',
                properties: {
                    from: {
                        type: 'string',
                        description: 'Sender (you).',
                        enum: [] // Consider making tools=[] dynamic, calculate on run in gpt() or runAI(), to take advantage of agents={} here.
                    },
                    to: {
                        type: 'string',
                        description: 'Recipient (the other agent).',
                        enum: []
                    },
                    message: {
                        type: 'string',
                        description: 'The message to be sent',
                    }
                },
                required: ['from', 'to', 'message']
            }
        }
    }
];

let terminate = false;
export function getTermination() {
    return terminate;
}

export const functions = {
    sendMessage: async (params) => {
        const { from, to, message } = params;
        agents[to]['send'](from, message);
        return `Message sent to ${to}`
    }
};

export const directorTools = [
    {
        type: 'function',
        function: {
            name: 'terminate',
            description: 'Terminate the conversation among all agents once the task has been completed.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    }
];

export const directorFunctions = {
    terminate: async (params) => {
        terminate = true;
    }
};

export const searcherTools = [
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
                        type: 'string',
                        description: 'Single-word tags to look for, these can be moods, genres, etc. The format myst always be as follows: tag:your_tag_1 tag:your_tag_2 ... tag:your_tag_n Obviously replace your_tag_x with the actual tag values.'
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
                        description: 'File format from the search result: mp4, avi, etcetera.',
                    },
                    description: {
                        type: 'string',
                        description: 'Video description'
                    }
                },
                required: ['url', 'file_type', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'downloadMusic',
            description: 'Download a music file. Returns downloaded file path and its description.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL of the music',
                    },
                    file_type: {
                        type: 'string',
                        description: 'File format from the search results, for example wav, mp3, etcetera.',
                    },
                    description: {
                        type: 'string',
                        description: 'Music description'
                    }
                },
                required: ['url', 'file_type', 'description']
            }
        }
    },
];

export const searcherFunctions = {
    searchVids: async (params) => {
        const { query } = params;
        console.log(`🔎🎥 Searching videos, query: ${query}`);
        const vids = await client.videos.search({
            query,
            per_page: 8
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
            messages.push({
                role: 'system',
                content: 'You process video thumbnails'
            });
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
                type: vids.videos[i].video_files[0].file_type,
                thumbnail: vids.videos[i].image,
                description: completion.choices[0].message.content
            });
        }
        return JSON.stringify(videos);
    },
    searchMusic: async (params) => {
        const { query, tags } = params;
        console.log(`🔎🎼 Searching music, query: ${query}, tags: ${tags}`);
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
        // console.log(response.data);
        await writeFile('./.env.refresh', response.data.refresh_token, 'utf8');
        const searchResult = await axios.get('https://freesound.org/apiv2/search/text/',
            {
                params: {
                    query,
                    page_size: 8,
                    filter: `category:Music ${tags}`,
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
        const { url, file_type, description } = params;
        console.log(`⏬🎥 Downloading Video, url: ${url}, description: ${description}`);
        const filepath = `./video${Date.now()}.${file_type}`;
        const response = await axios.get(url, { responseType: "stream" });
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        await finished(writer);
        return JSON.stringify(
            {
                filepath,
                description
            }
        )
    },
    downloadMusic: async (params) => {
        const { url, file_type, description } = params;
        console.log(`⏬🎼 Downloading Music, url: ${url}, description: ${description}`);
        const filepath = `./music${Date.now()}.${file_type}`;
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
        // console.log(response.data);
        await writeFile('./.env.refresh', response.data.refresh_token, 'utf8');
        const response2 = await axios.get(url, {
            responseType: "stream",
            headers: {
                Authorization: `Bearer ${response.data.access_token}`,
            },
        });
        const writer = fs.createWriteStream(filepath);
        response2.data.pipe(writer);
        await finished(writer);
        return JSON.stringify(
            {
                filepath,
                description
            }
        )
    }
};