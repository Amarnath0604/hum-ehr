import ENDPOINTS from './endpoints';
import { apiGet, apiPost } from './apiClient';
import { humCodeListToArray } from './lookupService';

/**
 * Patient Goals + SDOH Goals data layer. Mirrors the legacy patient.chart.goals.js
 * + api.utility.js wiring (both are distinct backends):
 *   patient list   GET  /humgoals/{recordType}/{patientId}/ALL?searchValue=&id={userId}  -> { data: { allGoals } }
 *   sdoh list      POST /sdoh-goal/{recordType}?patientId=&searchValue=                  -> { data: [...] }
 *   patient save   POST (json) /humgoals/save
 *   sdoh save      POST (json) /sdoh-goal/saveOrUpdate   (also used for SDOH delete via invalidFlag:'Y')
 *   patient delete POST (json) /humgoals/invalid
 *   patient lookup POST /humgoals/lookup  { goal: '' }
 *   sdoh lookup    GET  /sdoh-goal/lookup
 *   statuses       GET  /hum-codes/GOAL-STS-CODE
 * Save goes through the legacy auto-save pipeline (postJsonRequest ⇒ JSON body).
 */

// Patient list response nests under data.allGoals; SDOH list is a flat data array.
export const extractAllGoals = (response) => {
	if (response?.status !== 'success')
		return [];
	const data = response.data;
	if (Array.isArray(data))
		return data;
	return Array.isArray(data?.allGoals) ? data.allGoals : [];
};

// Legacy mapSdohGoalsList: normalize SDOH rows to the common goal shape the list/detail use.
export const mapSdohGoalsList = (goalsList = []) => goalsList.map((goal) => ({
	...goal,
	goalId: goal.id,
	goalName: goal.sdohGoalCodeDescription,
	goalNotes: goal.notes,
	isPatientEditable: 'N',
	isCareTeamPrescribed: 'N',
}));

export const fetchPatientGoals = ({ patientId, recordType = 'active', search = '', userId = '' }) => {
	const params = new URLSearchParams({ searchValue: search?.trim() || '', id: userId ?? '' });
	return apiGet(`${ENDPOINTS.goal.patientList(recordType, patientId)}?${params.toString()}`);
};

export const fetchSdohGoals = ({ patientId, recordType = 'active', search = '' }) => {
	const params = new URLSearchParams({ patientId: String(patientId), searchValue: search?.trim() || '' });
	return apiPost(`${ENDPOINTS.goal.sdohList(recordType)}?${params.toString()}`);
};

export const savePatientGoal = (payload) => apiPost(ENDPOINTS.goal.patientSave, payload);
export const saveSdohGoal = (payload) => apiPost(ENDPOINTS.goal.sdohSave, payload);
export const deletePatientGoal = (payload) => apiPost(ENDPOINTS.goal.patientInvalid, payload);

export const fetchPatientGoalOptions = () => apiPost(ENDPOINTS.goal.patientLookup, { goal: '' });
export const fetchSdohGoalOptions = () => apiGet(ENDPOINTS.goal.sdohLookup);
export const fetchGoalStatusCodes = () => apiGet(ENDPOINTS.goal.statusCodes);

const dataOrEmpty = (response) => (response?.status === 'success' ? response.data ?? [] : []);

// Legacy fetchInitialGoalLookups autocomplete-source shapes (kept verbatim).
export const buildPatientGoalAutocompleteSource = (goalTypeListDetails = []) => goalTypeListDetails.map((item) => ({
	id: item.code,
	goalName: item.groupName,
	value: `${item.groupName} ${item.description ? `- ${item.description}` : ''}`.trim(),
	itemDetails: item,
}));
export const buildSdohGoalAutocompleteSource = (sdohGoalListDetails = []) => sdohGoalListDetails.map((item) => ({
	id: item.code,
	goalName: item.description,
	value: item.description,
	itemDetails: item,
}));

/**
 * Loads the reference data the Goals section caches on mount: patient-goal options,
 * SDOH-goal options, and status codes (legacy fetchInitialGoalLookups).
 */
export const fetchGoalReferenceData = async () => {
	const [patientOptions, sdohOptions, statuses] = await Promise.all([
		fetchPatientGoalOptions(),
		fetchSdohGoalOptions(),
		fetchGoalStatusCodes(),
	]);
	const goalTypeListDetails = dataOrEmpty(patientOptions);
	const sdohGoalListDetails = dataOrEmpty(sdohOptions);
	return {
		goalTypeListDetails,
		sdohGoalListDetails,
		// GOAL-STS-CODE comes back as an object-map keyed by code; flatten to an array.
		goalStatusCodes: humCodeListToArray(statuses),
		patientGoalsAutoCompleteSource: buildPatientGoalAutocompleteSource(goalTypeListDetails),
		sdohGoalsAutoCompleteSource: buildSdohGoalAutocompleteSource(sdohGoalListDetails),
	};
};

const goalService = {
	extractAllGoals,
	mapSdohGoalsList,
	fetchPatientGoals,
	fetchSdohGoals,
	savePatientGoal,
	saveSdohGoal,
	deletePatientGoal,
	fetchPatientGoalOptions,
	fetchSdohGoalOptions,
	fetchGoalStatusCodes,
	buildPatientGoalAutocompleteSource,
	buildSdohGoalAutocompleteSource,
	fetchGoalReferenceData,
};
export default goalService;
