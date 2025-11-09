import OpenAI from "openai";
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agentA = [];
const agentB = [];

// Define their initial states
agentA.push({ role: "system", content: "You are Agent A, an inquisitive planner." });
agentB.push({ role: "system", content: "You are Agent B, an analytical responder." });

// Start the conversation
agentA.push({ role: "user", content: "Let's talk about renewable energy solutions." });

async function turn(speaker, listener) {
  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: speaker
  });
  const reply = res.choices[0].message.content;
  console.log(`\n💬 ${speaker === agentA ? "Agent A" : "Agent B"}: ${reply}`);

  // Update histories
  speaker.push({ role: "assistant", content: reply });
  listener.push({ role: "user", content: reply });
}

async function chatLoop(turns = 4) {
  for (let i = 0; i < turns; i++) {
    if (i % 2 === 0) await turn(agentA, agentB);
    else await turn(agentB, agentA);
  }
}

chatLoop();
