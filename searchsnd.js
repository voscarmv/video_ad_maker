import 'dotenv/config';
import OpenAI from 'openai';
import axios from 'axios';
import { readFile, writeFile } from 'node:fs/promises';

(async () => {
    // https://freesound.org/apiv2/search/text/?query=music&filter=tag:bass%20description:"heavy%20distortion"
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
                query: 'relaxing',
                filter: 'category:Music tag:jazz',
                fields: 'id,url,type,download,avg_rating,name,tags,description,duration'
            },
            headers: {
                Authorization: `Bearer ${response.data.access_token}`
            }
        }
    );
    console.log("Search results: ", searchResult.data);
})();