
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Cache remains in memory until logout or browser refresh.
const responseCache = new Map();
const inFlightRequests = new Map();

let cacheGeneration = 0;

const buildCacheKey = (url, config = {}) => {
  const params = config.params || {};

  const normalizedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `${config.baseURL || api.defaults.baseURL}:${url}:${JSON.stringify(normalizedParams)}`;
};

export const getCached = async (url, config = {}, options = {}) => {
  const { force = false } = options;
  const key = buildCacheKey(url, config);

  if (!force && responseCache.has(key)) {
    return responseCache.get(key);
  }

  if (!force && inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const requestGeneration = cacheGeneration;

  const request = api
    .get(url, config)
    .then((response) => {
      // Do not restore cache after logout or cache invalidation.
      if (
        requestGeneration === cacheGeneration &&
        inFlightRequests.get(key) === request
      ) {
        responseCache.set(key, response);
      }

      return response;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);

  return request;
};

export const invalidateApiCache = (urlPrefix) => {
  cacheGeneration += 1;

  if (!urlPrefix) {
    responseCache.clear();
    inFlightRequests.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (key.includes(`:${urlPrefix}:`)) {
      responseCache.delete(key);
    }
  }

  for (const key of inFlightRequests.keys()) {
    if (key.includes(`:${urlPrefix}:`)) {
      inFlightRequests.delete(key);
    }
  }
};

export const clearApiCache = () => {
  cacheGeneration += 1;
  responseCache.clear();
  inFlightRequests.clear();
};


export default api;
