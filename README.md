# video_ad_maker
Low-cost self-hosted fliki.ai clone

Set up instructions in `tools.js`, generate your freesound.org credentials with `npm install && node search/authsnd.js` and paste them in `.env`, then do

```
sudo apt-get install ffmpeg sox
npm install
node index.js > process.txt
```