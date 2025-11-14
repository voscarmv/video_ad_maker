import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from 'pexels';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import util from 'util';
import { exec } from 'node:child_process';
import { finished } from "stream/promises";
import { readFile, writeFile } from 'node:fs/promises';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const credentials = {
    type: process.env.type,
    project_id: process.env.project_id,
    private_key_id: process.env.private_key_id,
    private_key: process.env.private_key,
    client_email: process.env.client_email,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url,
    universe_domain: process.env.universe_domain,
};
const ttsclient = new TextToSpeechClient({ credentials });
const client = createClient(process.env.PEXELS_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});
const execAsync = util.promisify(exec);

export const agents = {};

// const team = ['director', 'searcher'];

export const roles = `
The goal is to produce a video announcing christmas.
Everyone focus on the task at hand primarily.
First have the writer create a script.
Then, pass the script to the voice recorder, who will produce a file with the speech, and another one with the SRT subtitles for the final cut.
Then, for each short phrase of the script, have the searcher look for one clip per phrase.
The idea is that in the end the videos will be joined together in sequence as background for the phrases in the script.
The sequence of videos should convey the message of the script.
Also have the searcher find a proper background music for the final video.
Evaluate search results before downloading, and if necessary run multiple different searches before downloading to refine the choice.
Everyone always share the file paths and results to the director.
Everyone should always send just one message at a time and wait for a response, and everyone should always respond when messaged to.
IMPORTANT: If you are missing any piece of information to do your task always ask the director, so the director can collect the needed information from others or share it if they already have it.

These are the members of the team (agents)

Director: Directs the whole operation. Communicates with team members to reach the goal. Request and pass on the information that each team member needs to complete their tasks. Terminates the process when all is done. Don't assume the others have the information, relay the info if needed.
Writer: Writes the script for the final video. The script must be short, composed by phrases that capture the subject of the final video.
Recorder: Creates the voice recording and SRT for the final cut. Share precise durations to the millisecond mark.
Searcher: Can search and download videos and music files. Searcher can perform several consecutive searches, but musta always get back to the director once something worth showing is found. Searcher can also download multiple files consecutively, but again must always report back to the director in the end. If you have trouble finding videos, try broadening the search by using fewer keywords. Consider single-word search queries. Before downloading anything describe your findings to discuss what fits best.
Editor: Generates the final cut. Requires the paths to all the videos, to the voice recording, to the srt and the durations of every phrase in order. Once the final clip is created let director know that you are done.
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
                        description: 'Single-word tags to look for. The format must always be as follows: tag:your_tag_1 tag:your_tag_2 ... tag:your_tag_n Obviously replace your_tag_x with the actual tag values.'
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
                        description: 'Three-letter file format from the search result: mp4, avi, etcetera.',
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
                        description: 'Three-letter file format from the search results, for example wav, mp3, etcetera.',
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

export const recorderTools = [
    {
        type: 'function',
        function: {
            name: 'recordVoice',
            description: 'Record the voice for the final clip and create the SRT file for the video subtitles',
            parameters: {
                type: 'object',
                properties: {
                    phrases: {
                        type: 'string',
                        description: 'The ordered phrases from the script separated by |',
                    },
                },
                required: ['phrases']
            }
        }
    }
];

export const recorderFunctions = {
    recordVoice: async (params) => {
        console.log('🗣️🎙️ Recording voice')
        const { phrases } = params;
        const chunks = phrases.split('|');
        const files = [];
        const durations = [];
        let srt = '';
        let currentTime = 0;
        function timecode(seconds) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
            const pad = (n, size = 2) => String(n).padStart(size, '0');
            return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
        }
        for (let i = 0; i < chunks.length; i++) {
            const filepath = `./voice${Date.now()}.wav`;
            const request = {
                input: { text: chunks[i] },
                voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
                audioConfig: { audioEncoding: 'LINEAR16' },
            };
            const [response] = await ttsclient.synthesizeSpeech(request);
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(filepath, response.audioContent, 'binary');
            files.push(filepath);
            const { stdout: duration, stderr: error } = await execAsync(`soxi -D ${filepath}`);
            const dur = Number(duration);
            if (error) return `Could not create voice recording`;
            const endTime = currentTime + dur;
            // console.log(`Text ${chunks[i]}, duration ${dur}, curr: ${currentTime}, end: ${endTime}`)
            srt = `${srt}${i + 1}\n${timecode(currentTime)} --> ${timecode(endTime)}\n${chunks[i]}\n\n`;
            durations.push(dur);
            currentTime = endTime;
        }
        const concats = files.join(' ');
        const voice_final = `./voice_final${Date.now()}.wav`;
        const { stderr: voiceerr } = await execAsync(`sox ${concats} ${voice_final}`);
        if (voiceerr) return "Could not create voice recording";
        const srt_path = `./srt${Date.now()}.srt`;
        await writeFile(srt_path, srt, 'utf8');
        return JSON.stringify({ voice_final, srt_path, durations });
    }

};

export const editorTools = [
    {
        type: 'function',
        function: {
            name: 'createVideo',
            description: 'Create the final clip with background music, voice and videos',
            parameters: {
                type: 'object',
                properties: {
                    video_paths: {
                        type: 'string',
                        description: 'The ordered paths to the videos separated by |',
                    },
                    durations: {
                        type: 'string',
                        description: 'The ordered durations in seconds, just float numbers, of each phrase separated by |'
                    },
                    voice_path: {
                        type: 'string',
                        description: 'Path of the final voice recording',
                    },
                    music_path: {
                        type: 'string',
                        description: 'Path to the background music',
                    },
                    srt_path: {
                        type: 'string',
                        description: 'Path to the SRT file'
                    }
                },
                required: ['video_paths', 'durations', 'voice_path', 'music_path', 'srt_path']
            }
        }
    }
];

export const editorFunctions = {
    createVideo: async (params) => {
        console.log('🎥✂️ Creating final cut');
        const { video_paths, durations, voice_path, music_path, srt_path } = params;
        const width = 1920;
        const height = 1080;
        // console.log(`params: ${JSON.stringify(params)}, w,h: ${width},${height}`);
        // Parse video list
        const videoPaths = video_paths
            .split("|")
            .map(s => s.trim())
            .filter(Boolean);

        // Parse durations (decimals allowed)
        const durs = durations
            .split("|")
            .map(s => Number(s.trim()))
            .filter(n => !isNaN(n));

        if (durs.length !== videoPaths.length) {
            throw new Error(
                `Number of durations (${durs.length}) does not match number of videos (${videoPaths.length}).`
            );
        }

        // All video inputs
        const videoInputArgs = videoPaths
            .map(v => `-i "${v}"`)
            .join(" ");

        // Add voice + music
        const wavInput = `-i "${voice_path}"`;
        const musicInput = `-i "${music_path}"`;

        // Build trim + scale + crop filters
        const videoFilters = videoPaths.map((_, i) => {
            const dur = durs[i];
            return (
                `[${i}:v]trim=start=0:end=${dur},setpts=PTS-STARTPTS,` +
                `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
                `crop=${width}:${height}:(iw-${width})/2:(ih-${height})/2[v${i}];`
            );
        }).join("");

        // Concat filter
        const concatLabels = videoPaths.map((_, i) => `[v${i}]`).join("");
        const concatFilter = `${concatLabels}concat=n=${videoPaths.length}:v=1:a=0[vid];`;

        // Subtitles MUST be applied inside the same filtergraph
        const subtitleFilter =
            `[vid]subtitles=${JSON.stringify(srt_path)}[subtitled];`;

        // Mix voice + music
        const audioMixFilter =
            `[${videoPaths.length}:a]volume=1.0[bg];` +
            `[${videoPaths.length + 1}:a]volume=0.4[music];` +
            `[bg][music]amix=inputs=2:normalize=1[audio]`;

        // FINAL filter_complex
        const filterComplex =
            `"${videoFilters}${concatFilter}${subtitleFilter}${audioMixFilter}"`;

        const finalOutput = `output${Date.now()}.mp4`;

        // FINAL ffmpeg command
        const cmd =
            `ffmpeg ${videoInputArgs} ${wavInput} ${musicInput} ` +
            `-filter_complex ${filterComplex} ` +
            `-map "[subtitled]" -map "[audio]" ` +
            `-c:v libx264 -crf 18 -preset medium ` +
            `-c:a aac -b:a 192k -loglevel error -shortest "${finalOutput}"`;

        console.log(cmd);
        const { stdout, stderr } = await execAsync(cmd);

        if (stderr) {
            console.error(stderr);
            return "Could not generate final clip";
        }

        return "Final clip generated.";
    }
};
