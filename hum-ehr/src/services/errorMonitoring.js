import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import config from '../config/env';

/**
 * Client error monitoring (Bugsnag) with HIPAA-minded scrubbing.
 *
 * The Bugsnag *notifier* key is a public client-side key by design (like a Sentry
 * DSN) — it only authorizes sending events, so shipping it in the bundle is safe,
 * unlike the server secrets env.js warns about.
 *
 * Guarded to production builds with a key configured, so `npm run dev` stays quiet
 * and nothing is ever sent without explicit configuration.
 */

let started = false;

/**
 * Keys whose values may carry PHI/PII. Bugsnag redacts these anywhere they appear
 * in metadata, query strings, and cookies before an event leaves the browser.
 */
const REDACTED_KEYS = [
    'X-Auth-Token',
    /token/i, /password/i, /secret/i, /authorization/i,
    /name/i, /email/i, /phone/i, /address/i, /dob/i, /birth/i,
    /ssn/i, /mrn/i, /medicare/i, /patient/i, /message/i, /data/i,
];

export const startErrorMonitoring = () => {
    if (started || !config.bugsnagApiKey || !import.meta.env.PROD) return;
    Bugsnag.start({
        apiKey: config.bugsnagApiKey,
        plugins: [new BugsnagPluginReact()],
        releaseStage: import.meta.env.MODE,
        redactedKeys: REDACTED_KEYS,
        collectUserIp: false,
        onError: (event) => {
            // HIPAA: strip anything that could carry patient data before sending.
            if (event.request) event.request.body = undefined;
            event.breadcrumbs = [];
            event.setUser(undefined);
            return true;
        },
    });
    started = true;
};

/** Report a boundary-caught / handled error. Safe no-op when monitoring is off. */
export const reportError = (error) => {
    if (!started) return;
    try { Bugsnag.notify(error); }
    catch { /* never let error reporting throw */ }
};

export default { startErrorMonitoring, reportError };
