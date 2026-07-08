/**
 * Shared JSDoc type definitions for editor type-checking (P8).
 *
 * These are documentation-only — they emit no runtime code. Reference them from
 * any module with an `import('...')` typedef, e.g.:
 *
 *   // @ts-check
 *   /** @typedef {import('../types/models').ApiResponse} ApiResponse *\/
 *
 * Type checking is opt-in per file via `// @ts-check` (jsconfig has checkJs off),
 * so annotating a file never affects the build — only the editor.
 */

/**
 * Standard backend response envelope, as returned by apiClient after it unwraps
 * `response.data`.
 * @typedef {Object} ApiResponse
 * @property {string} status  'success' | 'error' | ...
 * @property {string} [message]
 * @property {*} [data]
 * @property {number} [totalCount]
 * @property {number} [recordsFiltered]
 */

/**
 * A patient row after mapActivePatientRow normalization (the shape the UI uses).
 * @typedef {Object} ActivePatientRow
 * @property {string|number} id
 * @property {string|number} patientId
 * @property {number} [sno]
 * @property {string} fullName
 * @property {string} [gender]
 * @property {string} [genderCode]
 * @property {string} [dob]
 * @property {string} [emrId]
 * @property {string} [medicareNumber]
 * @property {string} [mobilePhoneNumber]
 * @property {string} [homePhoneNumber]
 * @property {string} [workPhoneNumber]
 * @property {Record<string, any>} raw
 */

/**
 * Result of fetchActivePatients.
 * @typedef {Object} ActivePatientsResult
 * @property {ActivePatientRow[]} rows
 * @property {number} totalRecords
 * @property {Record<string, any>} request
 */

export {};
