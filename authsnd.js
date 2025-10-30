import axios from 'axios';
import readline from 'readline';
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';

const clientid = process.env.FREESOUND_CLIENT_ID;
const readLineAsync = () => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    return new Promise((resolve) => {
        rl.prompt();
        rl.on('line', (line) => {
            rl.close();
            resolve(line);
        });
    });
};
(async () => {
    console.log('Login to auth', `https://freesound.org/apiv2/oauth2/authorize/?client_id=${clientid}&response_type=code&state=xyz`);
    console.log('Auth code:');
    const code = await readLineAsync();
    const params = {
        client_id: process.env.FREESOUND_CLIENT_ID,
        client_secret: process.env.FREESOUND_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
    };
    console.log(params);
    const data = new URLSearchParams(params);
    const response = await axios.post(
        "https://freesound.org/apiv2/oauth2/access_token/",
        data
    );
    console.log(response.data);
    await writeFile('./.env.refresh', response.data.refresh_token, 'utf8');
})();
