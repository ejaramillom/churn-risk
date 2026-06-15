require('dotenv').config();
const { readCsv, processWithThrottle } = require('./csvReader');
const { scoreAll } = require('./scorer');
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

// i keep defaulting to the orchestrator/pipeline pattern for automation processes
// it has proven to be battle tested
// allows for very easy maintenance and developer communications
// and any junior dev can read and understand what happens
// off course this is challenging to implement in high scale opinionated frameworks
// but it works like a charm on automation so i prefer it

// if no file is passed then we return an error
const resolveInput = () => {
    const fileFlagIndex = process.argv.indexOf('--file');
    const filePath = process.argv[fileFlagIndex + 1];

    // we need a file path AND in the right index
    if (fileFlagIndex !== -1 && filePath) return { type: 'file', path: filePath };
    if (!process.stdin.isTTY) return { type: 'stdin' };

    // i use this pattern instead of throw new Error.
    // Why?
    // because this would become into an otel structured log
    // that implements a fluentAPI or similar approach to log both to
    // a datalake like bigquery and
    // a structured log solution with business logic errors or management
    logger.error('No input. Use --file <path> or pipe CSV via stdin.');
    process.exit(1);
};

async function handler() {
    try {
        const input = resolveInput();

        // 1. Read and parse CSV
        const accounts = await readCsv(input);

        // 2. Score accounts (scorer)
        const atRisk = scoreAll(accounts);

        // 3. Generate LLM risk assessments per account (llm)

        // 4. Post formatted briefing to Slack (slack)

    } catch (error) {
        logger.error({ err: error.message }, 'Pipeline failed');
        process.exit(1);
    }
}

handler();