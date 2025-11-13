import { registerAgent, roles } from './tools.js';
import { runAI } from './gpt.js';
import { tools, agents, functions, getTermination } from './tools.js';

export class Agent {
    constructor(name, prompt, agentTools = [], agentFunctions = {}) {
        this.name = name;
        this.queue = [];
        this.isBusy = false;
        this.messages = [
            {
                role: 'system',
                content: `${prompt}\n\n${roles}`
            }
        ];
        this.tools = tools.concat(agentTools);
        this.functions = Object.assign({}, functions, agentFunctions);
        registerAgent(name, this.receive.bind(this));
    }
    receive(from, content) {
        console.log(`**** From: ${from}, To: ${this.name}\n${content}`);
        if (getTermination()) {
            return;
        }
        this.queue.push({
            role: 'user',
            content: `${from} sent you this message: ${content}`
        });
        if (!this.isBusy) this.#processMessages();
    }
    async #processMessages() {
        this.isBusy = true;
        while (this.queue.length > 0) {
            this.messages = this.messages.concat(this.queue);
            this.queue.length = 0;
            const reply = await runAI(
                this.name,
                agents,
                this.messages,
                this.tools,
                this.functions
            );
            this.messages = reply;
        }
        this.isBusy = false;
        return;
    }
}