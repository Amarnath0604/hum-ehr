import ENDPOINTS from './endpoints';
import { apiGet, apiPost, apiPostForm, apiPostMultipart } from './apiClient';

/**
 * Procedure (SOAP plan) data layer. Mirrors patient.ehr.procedure.surgical.js + api.utility.js:
 *   list        POST (form) /soap/plan/procedure/list        { patientId, encounterId, searchValue }
 *   save        POST (json) /soap/plan/procedure/saveOrUpdate
 *   invalidate  POST (form) /soap/plan/procedure/invalidate  { procedureId, patientId }
 *   group codes POST        /soap/plan/procedure-code-list?groupCode=...[&search=]
 *   lookups     POST (form) PRCNA → /soap/plan/procedure/lookup, PCRE → /referralReason-lookup,
 *               SDOH → /soap/plan/sdohIntervention/lookup, VACSITE → /bodySite-lookup (shared)
 *   location    GET         /facilities?search=
 *   report      GET         /soap/plan/reportFile?attachmentId=
 *   diagnosis   POST (multipart) /diagnosis/patient-diagnosis-problems { patientId }
 * The list returns active + deleted together; invalidFlag Y/N is split client-side.
 */
export const fetchProcedureList = async ({ patientId, search = '' }) => {
	const response = await apiPostForm(ENDPOINTS.procedure.list, {
		patientId,
		encounterId: '',
		searchValue: search || '',
	});
	const data = response?.status === 'success' && Array.isArray(response.data) ? response.data : [];
	return {
		activeList: data.filter((item) => item.invalidFlag === 'N'),
		deletedList: data.filter((item) => item.invalidFlag === 'Y'),
		response,
	};
};

export const deleteProcedure = ({ procedureId, patientId }) =>
	apiPostForm(ENDPOINTS.procedure.invalidate, { procedureId, patientId });

export const saveProcedure = (payload) => apiPost(ENDPOINTS.procedure.save, payload);

// Group-code option lists: PRST status, PROU outcome, PRCT category, PRFU follow-up type,
// PRCO complications (searched). POST with the params in the query string (legacy postRequest).
export const fetchProcedureGroupCodes = async (groupCode, search = '') => {
	const url = `${ENDPOINTS.procedure.groupCodes}?groupCode=${groupCode}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
	const response = await apiPostForm(url, {});
	return response?.status === 'success' && Array.isArray(response.data) ? response.data : [];
};

export const fetchProcedureReferenceData = async () => {
	const [statuses, outcomes, categories, followUpTypes] = await Promise.all([
		fetchProcedureGroupCodes('PRST'),
		fetchProcedureGroupCodes('PROU'),
		fetchProcedureGroupCodes('PRCT'),
		fetchProcedureGroupCodes('PRFU'),
	]);
	return { statuses, outcomes, categories, followUpTypes };
};

// Section lookups (min 3 chars enforced by callers). PRCNA labels are "code - description".
const mapLookup = (response, withCode = false) =>
	(response?.status === 'success' && Array.isArray(response.data) ? response.data : [])
		.map((item) => ({
			id: item.id,
			code: item.code,
			value: withCode ? `${item.code} - ${item.description}` : item.description,
			description: item.description,
		}));

export const fetchProcedureNameLookup = async (term) =>
	mapLookup(await apiPostForm(ENDPOINTS.procedure.lookup, { searchParameter: term }), true);
export const fetchReferralReasonLookup = async (term) =>
	mapLookup(await apiPostForm(ENDPOINTS.procedure.referralReasonLookup, { searchParameter: term }));
export const fetchSdohInterventionLookup = async (term) =>
	mapLookup(await apiPostForm(ENDPOINTS.procedure.sdohInterventionLookup, { searchParameter: term }));
export const fetchComplicationLookup = async (term) => {
	const list = await fetchProcedureGroupCodes('PRCO', term);
	return list.map((item) => ({ id: item.id, code: item.code, value: item.description, description: item.description }));
};
// Location = facilities search (legacy getLocationList → GET /facilities?search=).
export const fetchLocationLookup = async (term) => {
	const response = await apiGet(`${ENDPOINTS.lookup.facilities}?search=${encodeURIComponent(term || '')}`);
	const data = response?.status === 'success' ? response.data : null;
	return data ? Object.values(data).map((item) => ({ id: item.id, code: item.id, value: item.name })) : [];
};

// Patient problem + encounter diagnosis lists (shared by procedure & surgical pickers).
export const fetchPatientDiagnosisProblems = async (patientId) => {
	const response = await apiPostMultipart(ENDPOINTS.problem.patientProblems, { patientId: parseInt(patientId, 10) });
	const data = response?.status === 'success' ? (response.data || {}) : {};
	return {
		problemDiagnosisList: Array.isArray(data.problemDiagnosisList) ? data.problemDiagnosisList : [],
		encounterDiagnosisList: Array.isArray(data.encounterDiagnosisList) ? data.encounterDiagnosisList : [],
	};
};

export const fetchProcedureReport = (attachmentId) =>
	apiGet(`${ENDPOINTS.procedure.reportFile}?attachmentId=${attachmentId}`);
export const deleteProcedureReport = (attachmentId) =>
	apiPostForm(`${ENDPOINTS.procedure.deleteReport}?procedureId=${attachmentId}`, {});

/**
 * Mirrors procedureSurgicalUtils.getSelectedDiagnosisListIcdCode: only NEW selections
 * (no link id yet) and DELETED existing links are sent. Problem entries carry
 * diagnosisId; encounter entries carry hevpdId.
 */
export const buildDiagnosisListPayload = (diagnosisList = []) => diagnosisList
	.filter(({ invalidFlag, id }) => invalidFlag === 'Y' || id == null)
	.map(({ id, diagnosisId, hevpdId, invalidFlag }) => (diagnosisId
		? { id: id ?? null, invalidFlag, diagnosisId, hevpdId: null }
		: { id: id ?? null, invalidFlag, diagnosisId: null, hevpdId: id || hevpdId }));

/**
 * Mirrors PatientProcedureDetailsAddEdit.procedureSaveParam. `form` carries the resolved
 * lookup ids alongside typed values; fileDetail = [...newFiles, ...deletedFiles] (the
 * legacy UniversalFileUploader "N" branch); deviceList = new checks {id:null, deviceId}
 * plus deleted existing link rows (sent raw, as legacy does).
 */
export const buildProcedureSavePayload = ({ patientId, form, diagnosisList, fileDetail, deviceList }) => ({
	id: form.id || null,
	patientId,
	encounterId: null,
	procedureId: form.procedureId,
	procedureStatus: parseInt(form.procedureStatus, 10),
	procedureCategory: parseInt(form.procedureCategory, 10) || null,
	procedureOutcome: parseInt(form.procedureOutcome, 10) || null,
	procedureComplication: parseInt(form.procedureComplication, 10) || null,
	placeOfServiceId: form.placeOfServiceId || null,
	daysOrUnit: '',
	dateOfService: form.dateOfService,
	performedBy: form.performedBy,
	bodySiteId: form.bodySiteId || null,
	referralReasonId: form.referralReasonId || null,
	sdohInterventionId: form.sdohInterventionId || null,
	sdohInterventionDescription: form.sdohInterventionDescription || null,
	instruction: form.instruction || null,
	notes: form.notes,
	diagnosisList: buildDiagnosisListPayload(diagnosisList),
	fileDetail,
	deviceList,
	followUpDate: form.followUpDate || null,
	procedureFollowUp: parseInt(form.procedureFollowUp, 10) || null,
	invalidFlag: 'N',
});

const procedureService = {
	fetchProcedureList,
	deleteProcedure,
	saveProcedure,
	fetchProcedureGroupCodes,
	fetchProcedureReferenceData,
	fetchProcedureNameLookup,
	fetchReferralReasonLookup,
	fetchSdohInterventionLookup,
	fetchComplicationLookup,
	fetchLocationLookup,
	fetchPatientDiagnosisProblems,
	fetchProcedureReport,
	deleteProcedureReport,
	buildDiagnosisListPayload,
	buildProcedureSavePayload,
};
export default procedureService;
