import ENDPOINTS from './endpoints';
import { apiGet, apiPost, apiPostForm } from './apiClient';
import { fetchHumCodeList, humCodeListToArray } from './lookupService';

/**
 * Patient EHR Documents data layer. Mirrors patient.ehr.documents.js + api.utility.js:
 *   list       POST (json) /patient-documents/patientDocument/list
 *              { draw, length, start, patientId, filter:{categoryCode[], categorySubGroupCode[]}, order:{}, search }
 *   categories GET         /patient-documents/category-lookup
 *   statuses   GET         /hum-codes/DOC_STATUS
 *   files      POST        /patient-documents/getPatientDocumentsById?documentId=
 *   save       POST (json) /patient-documents/saveOrUpdate
 *   delete     POST        /patient-documents/deleteDocumentById?documentId=
 * Sub-group tabs: ALL expands to [LECOD, CARECO, PREWEL, PATAD, CLIRE, UNK].
 */
export const ALL_SUB_GROUP_CODES = ['LECOD', 'CARECO', 'PREWEL', 'PATAD', 'CLIRE', 'UNK'];

export const DOCUMENT_SUB_GROUPS = [
	{ code: 'ALL', label: 'All Documents' },
	{ code: 'CLIRE', label: 'Clinical Documents' },
	{ code: 'PATAD', label: 'Patient & Administrative' },
	{ code: 'PREWEL', label: 'Preventive & Wellness' },
	{ code: 'CARECO', label: 'Care Coordination' },
	{ code: 'LECOD', label: 'Legal, Consents & Directives' },
];

export const fetchPatientDocumentsList = async ({ patientId, draw = 1, start = 0, length = 10, search = '', categoryCodes = [], subGroupCode = 'ALL' }) => {
	const response = await apiPost(ENDPOINTS.patientDocuments.list, {
		draw,
		length,
		start,
		patientId,
		filter: {
			categoryCode: categoryCodes,
			categorySubGroupCode: subGroupCode === 'ALL' ? ALL_SUB_GROUP_CODES : [subGroupCode],
		},
		order: {},
		search: (search || '').trim(),
	});
	const rows = response?.status === 'success' && Array.isArray(response.data) ? response.data : [];
	return {
		rows,
		totalRecords: response?.recordsFiltered ?? response?.recordsTotal ?? rows.length,
		response,
	};
};

export const fetchDocumentCategories = async () => {
	const response = await apiGet(ENDPOINTS.patientDocuments.categoryLookup);
	const data = response?.status === 'success' && Array.isArray(response.data) ? response.data : [];
	// The legacy filter handles both {code, description} and {id, name} shapes.
	return data.map((c) => ({ code: c.code ?? c.id, description: c.description ?? c.name }));
};

// DOC_STATUS hum-codes. DOCERRIN stays in the list but is hidden in the select (legacy parity).
export const fetchDocumentStatuses = async () => humCodeListToArray(await fetchHumCodeList('DOC_STATUS'));

export const fetchDocumentFiles = (documentId) =>
	apiPostForm(`${ENDPOINTS.patientDocuments.getFiles}?documentId=${documentId}`, {});

export const deleteDocument = (documentId) =>
	apiPostForm(`${ENDPOINTS.patientDocuments.delete}?documentId=${parseInt(documentId, 10)}`, {});

export const saveDocument = (payload) => apiPost(ENDPOINTS.patientDocuments.save, payload);

/**
 * Mirrors getPatientEhrDocumentsSaveParam. fileDetail carries the DELETED existing files
 * (raw objects as returned by getPatientDocumentsById) plus the NEW files
 * ({ fileFormat, file(base64), documentDetailId: null, fileName }); untouched existing
 * files are not sent. statusCode falls back to DOCCURR.
 */
export const buildDocumentSavePayload = ({ docId, patientId, documentTitle, documentCategoryCode, documentDescription, recordedDate, statusCode, deletedFiles = [], newFiles = [] }) => ({
	docId: docId || null,
	caregroupId: null,
	patientId,
	documentTitle,
	documentCategoryCode,
	documentDescription,
	recordedDate,
	fileDetail: [
		...deletedFiles,
		...newFiles.map((f) => ({ fileFormat: f.fileFormat, file: f.file, documentDetailId: null, fileName: f.fileName })),
	],
	statusCode: statusCode || 'DOCCURR',
});

const documentsService = {
	ALL_SUB_GROUP_CODES,
	DOCUMENT_SUB_GROUPS,
	fetchPatientDocumentsList,
	fetchDocumentCategories,
	fetchDocumentStatuses,
	fetchDocumentFiles,
	deleteDocument,
	saveDocument,
	buildDocumentSavePayload,
};
export default documentsService;
