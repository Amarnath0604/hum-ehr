import ENDPOINTS from './endpoints';
import { apiGet, apiPost, apiPostForm } from './apiClient';
import { fetchHumCodeList, humCodeListToArray } from './lookupService';

/**
 * Family Health History data layer. Mirrors patient.pfsh.family.history.js + api.utility.js:
 *   list         GET         /familyHistory/list/{patientId}   → { membersList, diseaseList }
 *   snomedSearch POST (form)  /familyHistory/search/snomed      { searchSnomed, isDefaultValue }
 *   memberSave   POST (json)  /familyHistory/member/save        (incremental member auto-save)
 *   memberInvalid POST (form) /familyHistory/member/invalid     (delete a member/column)
 *   save         POST (json)  /familyHistory/save               (final matrix save)
 * The matrix: family members are columns, SNOMED conditions are rows, each cell marks
 * whether that member has that condition (+ optional notes).
 */
export const fetchFamilyHistory = async (patientId) => {
	const response = await apiGet(`${ENDPOINTS.familyHistory.list}${patientId}`);
	const data = response?.status === 'success' ? (response.data || {}) : {};
	return {
		members: Array.isArray(data.membersList) ? data.membersList : [],
		diseases: Array.isArray(data.diseaseList) ? data.diseaseList : [],
		response,
	};
};

// SNOMED condition search. isDefaultValue 'Y' returns the default condition rows.
export const searchFamilyHistorySnomed = async ({ searchSnomed = '', isDefaultValue = 'N' }) => {
	const response = await apiPostForm(ENDPOINTS.familyHistory.snomedSearch, { searchSnomed, isDefaultValue });
	return response?.status === 'success' ? (response.data || []) : [];
};

/**
 * Relation types (CARE_GIVER_TYPE hum-codes). Father/Mother are fixed columns and a
 * handful of non-family relations are excluded — matching the legacy add/edit filter.
 */
export const fetchFamilyRelationTypes = async () => {
	const arr = humCodeListToArray(await fetchHumCodeList('CARE_GIVER_TYPE'));
	const excluded = ['FRIE', 'MDWIF', 'NURSE', 'CGOTH', 'FAMLY', 'FTH', 'MTH'];
	return arr.filter((r) => !excluded.includes(r.code));
};

// Incremental family-member save (mirrors getSaveFamilyMemberDetailsParam).
export const saveFamilyMember = ({ id = '', name = '', dob = '', relationshipCode = '', isDiseased = 'N', patientId }) =>
	apiPost(ENDPOINTS.familyHistory.memberSave, { name, dob, relationshipCode, patientId, id: id || '', isDiseased });

// Delete a family member (mirrors deleteFamilyHistoryRequestParam).
export const deleteFamilyMember = ({ patientId, memberDetailId, changeLogMessage = '' }) =>
	apiPostForm(ENDPOINTS.familyHistory.memberInvalid, {
		patientId,
		memberDetailId,
		logId: '',
		careplanLogMessage: changeLogMessage,
		careplanLogMessageUserInput: changeLogMessage,
		encounterId: '',
	});

export const saveFamilyHistory = (payload) => apiPost(ENDPOINTS.familyHistory.save, payload);

/**
 * Mirrors PatientFamilyHistoryAddEdit.familyHistorySaveParam. `members` are columns with a
 * saved memberId; `cells` maps `${snomedCode}__${memberIndex}` → {checked, notes, diseaseId}.
 * NOTE: the backend field is the (misspelled) `diseiseaseList` — kept verbatim.
 */
export const buildFamilyHistorySavePayload = ({ patientId, members, conditions, cells, changeLogMessage = '' }) => ({
	patientId,
	familyHistory: members
		.filter((m) => m.memberId)
		.map((m) => ({
			memberId: m.memberId,
			diseiseaseList: conditions
				.filter((c) => cells[`${c.snomedCode}__${m.index}`]?.checked)
				.map((c) => {
					const cell = cells[`${c.snomedCode}__${m.index}`] || {};
					return {
						diseaseId: cell.diseaseId || '',
						snomedCode: c.snomedCode,
						patientId,
						memberId: m.memberId,
						encounterId: null,
						notes: cell.notes || '',
						snomedDesc: c.snomedDesc,
					};
				}),
		})),
	logId: '',
	careplanLogMessageUserInput: changeLogMessage,
	careplanLogMessage: changeLogMessage,
});

const familyHistoryService = {
	fetchFamilyHistory,
	searchFamilyHistorySnomed,
	fetchFamilyRelationTypes,
	saveFamilyMember,
	deleteFamilyMember,
	saveFamilyHistory,
	buildFamilyHistorySavePayload,
};
export default familyHistoryService;
