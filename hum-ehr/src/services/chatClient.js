import axios from 'axios';
import config from '../config/env';
import { getAuthToken, clearAuthToken } from './authService';

/**
 * Dedicated client for the Message Center chat "signal" microservice.
 *
 * Legacy contract (request.js `postRequestExternalURL`): POST to the absolute
 * `${signalUrl}/...` URL with a **form-urlencoded** body serialized by
 * jQuery.param() (deep bracket notation), the `X-Auth-Token` header from the
 * cookie, and the body additionally carrying `token` (the auth token) + `apiUrl`
 * (the standard backend base) so the microservice can call back into the EHR API.
 * Responses are JSON. This client reproduces that byte-for-byte so the Node
 * service sees identical requests to the JSP app.
 */

// ---- jQuery.param() equivalent -------------------------------------------------
// The legacy code serializes bodies with jQuery.param (deep, non-traditional):
// nested objects/arrays use bracket notation and empty arrays are omitted.
// URLSearchParams cannot express that, so we replicate $.param here.
const buildParams = (prefix, obj, parts) => {
    if (Array.isArray(obj)) {
        obj.forEach((value, index) => {
            // $.param non-traditional keys arrays by index: prefix[index]
            buildParams(`${prefix}[${index}]`, value, parts);
        });
    }
    else if (obj !== null && typeof obj === 'object') {
        Object.keys(obj).forEach((key) => {
            buildParams(`${prefix}[${key}]`, obj[key], parts);
        });
    }
    else {
        const value = obj === null || obj === undefined ? '' : obj;
        parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(value)}`);
    }
};

/** Serialize a plain object like jQuery.param() (deep). Spaces become '+'. */
export const jqueryParam = (data = {}) => {
    const parts = [];
    Object.keys(data).forEach((key) => {
        buildParams(key, data[key], parts);
    });
    return parts.join('&').replace(/%20/g, '+');
};

// ---- signal-service axios instance --------------------------------------------
const chatClient = axios.create({
    baseURL: config.signalUrl,
    timeout: 120000,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});

chatClient.interceptors.request.use((cfg) => {
    const token = getAuthToken();
    if (token) cfg.headers.set('X-Auth-Token', token);
    return cfg;
});

// Mirror apiClient: single logout on concurrent 401s, unwrap to response.data.
let isHandlingUnauthorized = false;
chatClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            if (!isHandlingUnauthorized) {
                isHandlingUnauthorized = true;
                clearAuthToken();
                window.location.href = `${window.location.origin}/logout`;
            }
            return Promise.reject(error);
        }
        const apiError = {
            message: error.response?.data?.message ?? error.message ?? 'Something went wrong. Please try again.',
            status: error.response?.status,
            cause: error,
        };
        return Promise.reject(apiError);
    },
);

/** Auth extras every external chat call carries in its body (legacy token+apiUrl). */
export const chatAuthExtras = () => ({
    token: getAuthToken() || '',
    apiUrl: config.apiBaseUrl,
});

/**
 * POST a form-urlencoded body (jQuery.param serialized) to the signal service.
 * `data` should already include token+apiUrl where the legacy param builder added
 * them (the service functions do this via chatAuthExtras()).
 */
export const chatPostForm = (path, data = {}) => chatClient.post(path, jqueryParam(data));

export default chatClient;
