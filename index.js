import 'dotenv/config';
import { Agent } from './Agent.js';
import {
    directorTools,
    directorFunctions,
    searcherTools,
    searcherFunctions
} from './tools.js';

const director = new Agent(
    'director',
    'You are the director.',
    directorTools,
    directorFunctions
);
const writer = new Agent(
    'writer',
    'You are the writer',
)
const searcher = new Agent(
    'searcher',
    'You are the searcher.',
    searcherTools,
    searcherFunctions
);

director.receive('system', 'Begin the process now.');
