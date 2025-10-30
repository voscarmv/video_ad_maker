import 'dotenv/config';
import OpenAI from 'openai';
import axios from 'axios';
import { readFile, writeFile } from 'node:fs/promises';

(async () => {
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
})();