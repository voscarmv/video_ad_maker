import { createClient } from 'pexels';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.PEXELS_KEY);
const sndkey = process.env.FREESOUND_KEY
const query = 'Nature';

(async () => {
    const vidsearch = await client.videos.search({ query, per_page: 1 });
    console.log(vidsearch);
    console.log(vidsearch.videos[0].video_files);
    const sndsearch = await axios.get(`https://freesound.org/apiv2/search/text/?query=piano&token=${sndkey}`);
    console.log(sndsearch.data);
    const sndid = sndsearch.data.results[0].id;
    console.log(sndid);
    const sndget = await axios.get(`https://freesound.org/apiv2/sounds/${sndid}/?token=${sndkey}`);
    console.log(sndget.data);
})();
