const axios = require("axios");

const { ValidationError, ServiceUnavailableError } = require("../errors");
const { openRedisClient, closeRedisClient } = require("./redis");

function getFreshNotebooksCacheKey() {
    return "cache:notebooks:fresh";
}

function getStaleNotebooksCacheKey() {
    return "cache:notebooks:stale";
}

async function fetchNotebooksAvailability(origin, endpoint = "/health") {
    try {
        const healthUrl = `${origin}${endpoint}`;
        const response = await axios.get(healthUrl);
        return response.status === 200;
    } catch (error) {
        console.error(`Error: notebooks service is down or unreachable (${error.message})`);
        return false;
    }
}

async function validateNotebook(notebookId, origin, endpoint = "/api/notebooks/") {
    const redisClient = await openRedisClient();

    try {
        const isNotebookValid = await validateNotebookWithCaching(redisClient, notebookId, origin, endpoint);
        return isNotebookValid;
    } catch (error) {
        // 4. Fallback to notebooks service if cache is unavailable
        console.error(`Error: Cache unavailable (${error.message}). Trying validation against notebooks service...`);
        endpoint = endpoint + `${notebookId}`;
        const isNotebookValid = await validateNotebookAgainstService(notebookId, origin, endpoint);
        return isNotebookValid;
    } finally {
        await closeRedisClient(redisClient);
    }

    return false;  // default to invalid notebook
}

async function validateNotebookWithCaching(redisClient, notebookId, origin, endpoint = "/api/notebooks/") {
    /**
     * 1. GET from fresh cache
     *    -> if success, return true
     *    -> if fail, goto 2.
     * 2. GET /api/notebooks/:id
     *    -> if success, SET fresh & stale caches
     *                   && return true
     *    -> if fail, goto 3.
     * 3. GET from stale cache
     *    -> if success, return true
     *    -> if fail, return false
     */

    // 1. Try validation against fresh cache
    try {
        const isNotebookValid = await validateNotebookAgainstFreshCache(redisClient, notebookId);
        return isNotebookValid;
    } catch (error) {
        console.error(`Error: fresh cache validation failed for notebook ${notebookId} (${error.message}). Trying notebooks service...`);
    }

    // 2. Try validation against notebooks service
    try {
        const notebooks = await getAllNotebooks(origin, endpoint);
        await refreshCache(redisClient, notebooks);
        const isValidNotebook = notebooks.some(notebook => notebook.id === notebookId);
        return isValidNotebook;
    } catch (error) {
        console.error(`Error: notebooks service validation failed for notebook ${notebookId} (${error.message}). Trying stale cache...`);
    }

    // 3. Try validation against stale cache
    try {
        const isNotebookValid = await validateNotebookAgainstStaleCache(redisClient, notebookId);
        return isNotebookValid;
    } catch (error) {
        console.error(`Error: stale cache validation failed for notebook ${notebookId} (${error.message}). Defaulting to invalid notebook.`);
    }
}

/**
 * Validate notebook against fresh cache
 * @param {RedisClient} redisClient - The Redis client
 * @param {string} notebookId - The ID of the notebook to validate
 * @returns {boolean} - True if the notebook is valid, false otherwise
 * @throws {ValidationError} - If the fresh cache is empty
 */
async function validateNotebookAgainstFreshCache(redisClient, notebookId) {
    // GET from fresh cache
    // if nil, throw custom error
    // if notebook in notebooks, return true
    // else, return false
    const freshCacheKey = getFreshNotebooksCacheKey();
    const freshCacheValue = await redisClient.get(freshCacheKey);
    if (!freshCacheValue) {
        throw new ValidationError("Fresh notebooks cache is empty");
    }

    const notebooks = JSON.parse(freshCacheValue);
    const isValidNotebook = notebooks.some(notebook => notebook.id === notebookId);
    return isValidNotebook;
}

/**
 * Validate notebook against stale cache
 * @param {RedisClient} redisClient - The Redis client
 * @param {string} notebookId - The ID of the notebook to validate
 * @returns {boolean} - True if the notebook is valid, false otherwise
 * @throws {ValidationError} - If the stale cache is empty
 */
async function validateNotebookAgainstStaleCache(redisClient, notebookId) {
    // GET from stale cache
    // if nil, throw custom error
    // if notebook in notebooks, return true
    // else, return false
    const staleCacheKey = getStaleNotebooksCacheKey();
    const staleCacheValue = await redisClient.get(staleCacheKey);
    if (!staleCacheValue) {
        throw new ValidationError("Stale notebooks cache is empty");
    }

    const notebooks = JSON.parse(staleCacheValue);
    const isValidNotebook = notebooks.some(notebook => notebook.id === notebookId);
    return isValidNotebook;
}

/**
 * Get all notebooks from notebooks service
 * @param {string} origin - The origin of the notebooks service
 * @param {string} endpoint - The endpoint of the notebooks service
 * @returns {Array} - An array of notebook ids
 * @throws {ServiceUnavailableError} - If the notebooks service is down or unreachable
 */
async function getAllNotebooks(origin, endpoint = "/api/notebooks") {
    // check notebooks service availability
    // if not available, throw custom error
    // if available, GET /api/notebooks
    // map notebooks to notebook ids
    // return notebook ids
    const isNotebooksAvailable = await fetchNotebooksAvailability(origin);
    if (!isNotebooksAvailable) {
        throw new ServiceUnavailableError("Notebooks service is down or unreachable");
    }

    const notebooksUrl = `${origin}${endpoint}`;
    const response = await axios.get(notebooksUrl);
    const notebooks = response.data;
    const notebookIds = notebooks.map(notebook => { return { id: notebook.id } } );
    return notebookIds;
}

/**
 * Refresh cache with notebooks
 * @param {RedisClient} redisClient - The Redis client
 * @param {Array} notebooks - An array of notebook ids
 * @param {number} ttl - The TTL of the cache
 */
async function refreshCache(redisClient, notebooks, ttl = 1) {
    // SET fresh cache with notebooks and TTL to 5 seconds
    // SET stale cache with notebooks
    const freshCacheKey = getFreshNotebooksCacheKey();
    const staleCacheKey = getStaleNotebooksCacheKey();
    await redisClient.set(freshCacheKey, JSON.stringify(notebooks), { EX: ttl });
    await redisClient.set(staleCacheKey, JSON.stringify(notebooks));
}

/**
 * Validate notebook against notebooks service (used as fallback)
 * @param {string} notebookId - The ID of the notebook to validate
 * @param {string} origin - The origin of the notebooks service
 * @param {string} endpoint - The endpoint of the notebooks service
 * @returns {boolean} - True if the notebook is valid, false otherwise
 */
async function validateNotebookAgainstService(notebookId, origin, endpoint = "/api/notebooks/:id") {
    const validationUrl = `${origin}${endpoint.replace(":id", notebookId)}`;

    try {
        const isNotebooksAvailable = await fetchNotebooksAvailability(origin);
        if (!isNotebooksAvailable) {
            return false;
        }

        const response = await axios.get(validationUrl);
        return response.status === 200;
    } catch (error) {
        console.error(`Error: failed to validate notebook ${notebookId} (${error.message})`);
        return false;
    }
}

module.exports = { fetchNotebooksAvailability, validateNotebook };
