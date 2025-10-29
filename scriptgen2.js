import OpenAI from "openai";
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "Write a surrealist prose." }],
    model: "gpt-4o",
    temperature: 1.222,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'poem_srt',
        schema: {
          type: "object",
          properties: {
            sentences: {
              type: "array",
              description: "Array of subtitle blocks for SRT",
              items: {
                description: "a single subtitle block, it can be a fraction of a sentence",
                type: "string"
              }
            }
          }
        }
      }
    }
  });

  const blocks = JSON.parse(completion.choices[0].message.content).sentences;
  for(let i = 0; i < blocks.length; i++){
    console.log(blocks[i]);
  }

}

main();