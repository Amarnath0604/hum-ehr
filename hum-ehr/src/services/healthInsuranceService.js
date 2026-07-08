import ENDPOINTS from './endpoints';
import { apiGet, apiPost, apiPostForm } from './apiClient';
import { fetchHumCodeList, humCodeListToArray } from './lookupService';

/**
 * Health insurance data layer. Mirrors patient.chart.health.insurance.js + api.utility.js:
 *   list    GET  /insurance/{recordType}/list/{patientId}  -> { data: { insuranceList, isMedicarePatient, awvConfigurationEditableFlag } }
 *   save    POST (json) /insurance/save        (legacy auto-save pipeline)
 *   invalid POST (form) /insurance/invalid     { id, patientId }
 *   payers  GET  /payer/list                   (insurance providers)
 *   lookup  POST (form) /payer/lookup          { category }  (INSRELSHP relationships, PAYRTYP payer types)
 *   humcodes /hum-codes/INSURANCE-TYPE, /hum-codes/INSURANCE-STATUS
 */
export const fetchPatientHealthInsurance = async ({ patientId, recordType = 'active' }) => {
	const response = await apiGet(ENDPOINTS.healthInsurance.list(recordType, patientId));
	const data = response?.status === 'success' ? response.data || {} : {};
	const insuranceList = Array.isArray(data.insuranceList) ? data.insuranceList : [];
	return {
		insuranceList,
		isMedicarePatient: data.isMedicarePatient,
		awvConfigurationEditableFlag: data.awvConfigurationEditableFlag,
		response,
	};
};

export const savePatientHealthInsurance = (payload) => apiPost(ENDPOINTS.healthInsurance.save, payload);

// Legacy deleteHealthInsuraceDetails uses postRequest (form-urlencoded) with { id, patientId }.
export const deletePatientHealthInsurance = ({ id, patientId }) =>
	apiPostForm(ENDPOINTS.healthInsurance.invalid, { id, patientId });

export const fetchPayerList = () => apiGet(ENDPOINTS.healthInsurance.payerList);
export const fetchPayerLookup = (category) => apiPostForm(ENDPOINTS.healthInsurance.payerLookup, { category });

const dataOrEmpty = (response) => (response?.status === 'success' ? response.data ?? [] : []);

/**
 * Reference data the add/edit form needs (legacy getPatientHealthInsuranceOptionsList):
 * insurance types, subscriber relationships, statuses, provider list, payer types.
 */
export const fetchInsuranceMetadata = async () => {
	const [types, relationships, statuses, providers, payerTypes] = await Promise.all([
		fetchHumCodeList('INSURANCE-TYPE'),
		fetchPayerLookup('INSRELSHP'),
		fetchHumCodeList('INSURANCE-STATUS'),
		fetchPayerList(),
		fetchPayerLookup('PAYRTYP'),
	]);
	return {
		insuranceTypes: humCodeListToArray(types),
		relationships: dataOrEmpty(relationships),
		statuses: humCodeListToArray(statuses),
		providers: dataOrEmpty(providers),
		payerTypes: dataOrEmpty(payerTypes),
	};
};

/**
 * Mirrors PatientHealthInsuranceAddEdit.patientHealthInsuranceSaveParam.
 * `form` is the flat React form state; `subscriber`/`member` are nested objects.
 * Member is null when the relationship is SELF (legacy getSubscriberMemberRequestObject).
 */
export const buildHealthInsuranceSavePayload = ({ patientId, form }) => {
	const isSelf = form.relationshipCode === 'SELF';
	return {
		id: form.id || null,
		patientId: patientId || null,
		policyNumber: form.policyNumber || null,
		groupNumber: form.groupNumber || null,
		groupName: form.groupName || null,
		insuranceStatusCode: form.insuranceStatusCode,
		insuranceType: form.insuranceType || null,
		payerId: form.payerId || null,
		effectiveDate: form.effectiveDate || null,
		// Medicare (payerTypeCode '1') has no last-effective date.
		lastEffectiveDate: form.payerTypeCode !== '1' ? (form.lastEffectiveDate || null) : null,
		qualifiedMedicareBeneficiaryFlag: form.qualifiedMedicareBeneficiary ? 'Y' : 'N',
		subscriber: {
			relationShipTypeId: form.subscriber.relationShipTypeId || null,
			number: form.subscriber.number || null,
			otherRelationShip: form.subscriber.otherRelationShip || null,
			firstName: form.subscriber.firstName || null,
			middleName: form.subscriber.middleName || null,
			lastName: form.subscriber.lastName || null,
			dob: form.subscriber.dob || null,
			addressLineOne: form.subscriber.addressLineOne || null,
			addressLineTwo: form.subscriber.addressLineTwo || null,
			city: form.subscriber.city || null,
			state: form.subscriber.state || null,
			zipCode: form.subscriber.zipCode || null,
			phoneNumber: form.subscriber.phoneNumber || null,
			country: form.subscriber.country || null,
		},
		member: isSelf ? null : {
			firstName: form.member.firstName || null,
			middleName: form.member.middleName || null,
			number: form.member.number || null,
			lastName: form.member.lastName || null,
			dob: form.member.dob || null,
			addressLineOne: form.member.addressLineOne || null,
			addressLineTwo: form.member.addressLineTwo || null,
			city: form.member.city || null,
			state: form.member.state || null,
			zipCode: form.member.zipCode || null,
			country: form.member.country || null,
			phoneNumber: form.member.phoneNumber || null,
		},
	};
};

const healthInsuranceService = {
	fetchPatientHealthInsurance,
	savePatientHealthInsurance,
	deletePatientHealthInsurance,
	fetchPayerList,
	fetchPayerLookup,
	fetchInsuranceMetadata,
	buildHealthInsuranceSavePayload,
};
export default healthInsuranceService;
