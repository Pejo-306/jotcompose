async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, maxRetries = 3, delay = 1000) {
    let lastError = null;

    for (let i = 1; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.log(`Retrying... (${i}/${maxRetries})`);
            await sleep(delay);
        }
    }
    throw lastError;
}

module.exports = { retry };