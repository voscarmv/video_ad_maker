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
    'You are the editor.',
    directorTools,
    directorFunctions
);
const searcher = new Agent(
    'searcher',
    'You are the writer.',
    searcherTools,
    searcherFunctions
);

director.receive('system', 'Begin the process now.');
