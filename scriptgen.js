import OpenAI from "openai";
import 'dotenv/config';

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_KEY,
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "Write some surrealist prose." }],
    model: "deepseek-chat",
    temperature: 2.0
  });

  console.log(completion.choices[0].message.content);
}

main();