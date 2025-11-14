import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_KEY,
// });

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY
});


async function gpt(messages, tools) {
  const completion = await openai.chat.completions.create({
    messages,
    tools,
    model: 'deepseek-chat',
  });
  const message = completion?.choices?.[0]?.message;
  return {
    message,
    tool_calls: message?.tool_calls || []
  };
}

async function callTool(tool_call, additionalArgs, functions) {
  const tool_call_id = tool_call?.id;
  const functionName = tool_call?.function?.name;
  const functionArgs = JSON.parse(tool_call?.function?.arguments || '{}');
  const fn = functions[functionName];
  if (!fn) throw new Error(`Function "${functionName}" not found.`);
  const content = await fn(functionArgs, additionalArgs);
  return {
    tool_call_id,
    content
  };
}

export async function runAI(name, agents, messages, tools, functions, additionalArgs = {}) {
  const team = [];
  for (const agent in agents) {
    team.push(agent);
  }
  tools[0].function.parameters.properties.from.enum = team;
  tools[0].function.parameters.properties.to.enum = team;
  let reply = await gpt(messages, tools);
  const message = {
    role: 'assistant',
    content: reply.message?.content || '',
    ...(reply.tool_calls?.length ? { tool_calls: reply.tool_calls } : {})
  };
  messages.push(message);
  let messageSent = false;
  if (reply.tool_calls) {
    for (let i = 0; i < reply.tool_calls.length; i++) {
      const result = await callTool(reply.tool_calls[i], additionalArgs, functions);
      messages.push({
        role: 'tool',
        tool_call_id: result.tool_call_id,
        content: result.content || ''
      });
      if(reply.tool_calls[i].function.name === 'sendMessage') messageSent = true;
    }
    if(!messageSent) return runAI(name, agents, messages, tools, functions, additionalArgs);
  }
  return messages;
}
