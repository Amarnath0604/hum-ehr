import moment from '../utils/dayjs';
import ENDPOINTS from './endpoints';
import { apiGet, apiPost, apiPostForm, apiPostMultipart } from './apiClient';
import { getLoggedInUser } from './authService';
import { fetchPatientDetails } from './patientService';
import patientCache from '../utils/patientCache';

/**
 * Patient Profile service. Legacy contracts preserved:
 * - demographics / contact-info / mobile-access / preferred-day-time saves are
 *   multipart form posts carrying one `data` field with the JSON payload
 *   (legacy `_saveFormDataApiCall` → `postRequestForFormData`).
 * - address save + care-giver / specialty-provider saves are JSON posts.
 * - care team fetch AND save both hit POST /careteam form-encoded.
 */

const postDataFormPayload = (url, payload) => apiPostMultipart(url, { data: JSON.stringify(payload) });

/** Re-fetch patient details after a profile save and refresh the shared cache. */
export const refreshPatientDetails = async (patientId) => {
    const response = await fetchPatientDetails(patientId);
    if (response?.status === 'success') {
        const data = response.data || {};
        patientCache.set(`${patientId}_details`, data.patientDetails);
        patientCache.set(`${patientId}_subscribedProducts`, data.subscribedProducts);
        patientCache.set(`${patientId}_sdohHistory`, data.sdohVisitHisotryDetails);
        return data.patientDetails || null;
    }
    return null;
};

/** Patient details via the shared cache (fetches + caches when absent). */
export const getPatientDetails = async (patientId) => {
    const cached = patientCache.get(`${patientId}_details`);
    if (cached) return cached;
    return refreshPatientDetails(patientId);
};

// ---- Demographics ----

export const fetchDemographicsHumCodes = async () => {
    const groupCodes = ['PATI-GENDER', 'SEXUAL-ORIENTATION', 'GENDER-IDENTITY', 'UTC-TIMEZONE', 'PATI-PRONOUNS',
        'INTERPRETER-NEEDED', 'SEX-PARAMETER-CLINICAL-USE'];
    // Legacy request.postRequest = form-urlencoded (JSON returns 404 here).
    const response = await apiPostForm(ENDPOINTS.lookup.multipleHumCodes, { groupCodes: groupCodes.join(',') });
    return response?.status === 'success' ? response.data || {} : {};
};

export const fetchProfileTimeZones = async () => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.timeZoneHumCodes}?id=${getLoggedInUser()?.userId || ''}`);
    const data = response?.status === 'success' ? response.data : null;
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
};

/** Full ethnicity reference list (client-side filtered in the picker). */
export const fetchEthnicityLookup = async () => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.ethnicityLookup}?id=${getLoggedInUser()?.userId || ''}`);
    const data = response?.status === 'success' ? response.data || [] : [];
    return data.map((item) => ({
        value: item.ethnicity,
        code: item.ethnicityConceptCode,
        categoryName: item.ethnicityGroupName,
    }));
};

/**
 * Paginated lookups (race / language / occupation / occupation industry).
 * Legacy fetchPaginationLookUpDataAvailableInApp: POST {start, length:50, search};
 * scrolling the suggestion list to the bottom appends the next 50 while
 * totalRecords > start + 50.
 */
export const LOOKUP_PAGE_SIZE = 50;
const paginatedLookup = async (url, search = '', start = 0) => {
    const response = await apiPost(url, { start, length: LOOKUP_PAGE_SIZE, search });
    return {
        data: response?.status === 'success' ? response.data || [] : [],
        totalRecords: response?.totalRecords ?? 0,
    };
};
// Response field names per legacy getObjectKeyForAutoCompleteSetup:
// race → [raceConceptCode, race, raceCategoryCode, raceCategoryName],
// prefLanguage → [languageId, languageName], occupation(+industry) → [id, name].
export const fetchRaceLookupPage = async (search, start = 0) => {
    const { data, totalRecords } = await paginatedLookup(ENDPOINTS.patientProfile.raceLookup, search, start);
    return { options: data.map((item) => ({ value: item.raceConceptCode, label: item.race, categoryName: item.raceCategoryName || '' })), totalRecords };
};
export const fetchLanguageLookupPage = async (search, start = 0) => {
    const { data, totalRecords } = await paginatedLookup(ENDPOINTS.patientProfile.languageLookup, search, start);
    return { options: data.map((item) => ({ value: item.languageId, label: item.languageName })), totalRecords };
};
export const fetchOccupationLookupPage = async (search, start = 0) => {
    const { data, totalRecords } = await paginatedLookup(ENDPOINTS.patientProfile.occupationLookup, search, start);
    return { options: data.map((item) => ({ value: item.id ?? item.code, label: item.name ?? item.value })), totalRecords };
};
export const fetchOccupationIndustryLookupPage = async (search, start = 0) => {
    const { data, totalRecords } = await paginatedLookup(ENDPOINTS.patientProfile.occupationIndustryLookup, search, start);
    return { options: data.map((item) => ({ value: item.id ?? item.code, label: item.name ?? item.value })), totalRecords };
};

/** Duplicate-field check (emrId / mobile / email). Legacy /eligible-patient/validation. */
export const validateUniquePatientField = (fieldName, fieldValue, patientId) => apiPostForm(ENDPOINTS.patientProfile.uniqueValidation, {
    fieldName, patientId, fieldValue, eligiblePatientId: -1, batchId: 'Manual', isFromEligible: false,
});

export const saveDemographics = (payload) => postDataFormPayload(ENDPOINTS.patientProfile.updateDemographics, payload);

/** Mirrors legacy requestParamForSaveDemographicsDetails. */
export const buildDemographicsSavePayload = ({ patientId, patientDetails, form, raceList, ethnicityList, moveNextTab }) => ({
    facility: patientDetails.facility,
    id: patientId,
    personId: patientDetails.patientId,
    userId: patientDetails.userId,
    emrId: patientDetails.emrId,
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    preferredName: form.preferredName,
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    sexualOrientation: form.sexualOrientation,
    genderIdentity: form.genderIdentity,
    ethnicity: '',
    ethnicityTwo: '',
    race: '',
    raceTwo: '',
    ethnicityCodes: ethnicityList.map((item) => item.conceptCode) || null,
    raceCodes: raceList.map((item) => item.conceptCode) || null,
    patientHeight: form.patientHeight || null,
    patientWeight: form.patientWeight || null,
    preferredLanguage: form.preferredLanguageCode || null,
    timeZone: form.timeZone || null,
    previousName: form.previousName || null,
    dateOfDeath: form.dateOfDeath || null,
    suffixName: form.suffixName || null,
    interpreterNeeded: form.interpreterNeeded || null,
    pronouns: form.pronouns || null,
    sexParameterForClinicalUse: form.sexParameterForClinicalUse,
    tribalAffiliation: form.tribalAffiliation || null,
    occupationId: form.occupationId || null,
    occupationIndustryId: form.occupationIndustryId || null,
    causeOfDeath: form.causeOfDeath || null,
    moveNextTab: moveNextTab || null,
});

// ---- Contact information (phone) ----

export const fetchCommunicationMethods = async () => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.commMethods}?id=${getLoggedInUser()?.userId || ''}`);
    const data = response?.status === 'success' ? response.data : null;
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
};

export const savePhoneInformation = (payload) => postDataFormPayload(ENDPOINTS.patientProfile.updateContactInfo, payload);

export const sendPhoneVerificationCode = ({ number, patientId, isResend }) => apiPostForm(isResend ? ENDPOINTS.patientProfile.smsResend : ENDPOINTS.patientProfile.smsValidateNumber, { number, patientId });

export const validatePhoneOtp = ({ otp, patientId }) => apiPostForm(ENDPOINTS.patientProfile.smsValidateOtp, { otp, patientId });

/** Mirrors legacy requestParamForPhoneInformationSave. */
export const buildPhoneInformationSavePayload = ({ patientId, patientDetails, form }) => {
    const { textMessageSpan, mobilePhone, mobilePhoneInvalidFlag, personId, userId, textMessageFrequency,
        disableRPMMissedVitalTextMessageFlag, textMessageConsent } = patientDetails;
    const textMessageConsentValue = mobilePhone === form.mobilePhone
        && mobilePhoneInvalidFlag === form.invalidMobileNumber
        && form.textMessageConsent === textMessageConsent
        ? textMessageConsent : form.textMessageConsent;
    return {
        id: patientId,
        personId: personId || null,
        userId: userId || null,
        textMessageConsent: textMessageConsentValue,
        mobilePhone: form.mobilePhone || null,
        mobilePhoneInvalidFlag: form.invalidMobileNumber,
        homePhone: form.homePhone || null,
        pagerPhoneInvalidFlag: form.invalidHomeNumber,
        workPhone: form.workPhone || null,
        workPhoneInvalidFlag: form.invalidWorkNumber,
        otherPhone: form.otherPhone || null,
        otherPhoneInvalidFlag: form.invalidOtherNumber,
        faxPhone: form.faxNumber || null,
        email: form.email || null,
        primaryCommunication: form.primaryCommunication || null,
        secondaryCommunication: form.secondaryCommunication || null,
        disableRPMMissedVitalTextMessageFlag,
        textMessageSpan,
        textMessageFrequency,
        patientCallRecordingPreference: form.patientCallRecordingPreference,
    };
};

// ---- Address information ----

export const fetchPreviousAddressList = async (patientId) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.previousAddressList}${patientId}`);
    return response?.status === 'success' ? response.data || [] : [];
};

export const validateZipCode = async (zip) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.zipcode(zip)}?id=${getLoggedInUser()?.userId || ''}`);
    return response?.status === 'success' ? response.data || [] : null;
};

export const saveAddressInformation = (payload) => apiPost(ENDPOINTS.patientProfile.addressSaveOrUpdate, payload);

// ---- Care team ----

export const fetchCarePlanDetails = async (patientId, carePlanId) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.carePlanDetails(patientId, carePlanId)}?id=${getLoggedInUser()?.userId || ''}`);
    return response?.status === 'success' ? response.data || {} : {};
};

export const fetchPhysiciansList = async (facilityId = '') => {
    const response = await apiPostForm(ENDPOINTS.lookup.physiciansInCareGroup, { facilityId, careGroupId: '' });
    return response?.status === 'success' ? response.data || {} : {};
};

export const fetchCliniciansList = async (facilityId = '') => {
    const response = await apiPostForm(ENDPOINTS.lookup.clinicians, { facilityId, careGroupId: '' });
    return response?.status === 'success' ? response.data || {} : {};
};

/** Fetch (all-null params) and save (member set) share POST /careteam. */
export const fetchOrSaveCareTeam = ({ patientId, physicianId = null, clinicianId = null, alertFlag = null }) => apiPostForm(ENDPOINTS.patientProfile.careTeam, {
    patientId,
    physicianId: physicianId ?? '',
    clinicianId: clinicianId ?? '',
    alertFlag: alertFlag ?? '',
});

// ---- Specialty providers ----

export const fetchSpecialtyProvidersList = async (recordType, patientId) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.specialtyProviders}/${recordType}/${patientId}?id=${getLoggedInUser()?.userId || ''}`);
    return response?.status === 'success' ? response.data || [] : [];
};

export const fetchTaxonomyLookup = async (keyword) => {
    const response = await apiPostForm(`${ENDPOINTS.patientProfile.taxonomyLookup}?keyword=${encodeURIComponent(keyword)}`, {});
    return response?.status === 'success' ? response.data || [] : [];
};

/** Duplicate specialty-provider check; legacy validator expects raw boolean true. */
export const validateSpecialtyProviderUnique = (payload) => apiPost(ENDPOINTS.patientProfile.specialtyProviderValidation, payload);

export const saveSpecialtyProvider = (payload) => apiPost(ENDPOINTS.patientProfile.specialtyProviders, payload);

export const deleteSpecialtyProvider = ({ recordType, patientId, healthCareProviderId, lastEffectiveDate }) => apiPost(ENDPOINTS.patientProfile.specialtyProviderInvalid, {
    activeFlag: recordType === 'active' ? 'Y' : 'N',
    patientId,
    healthCareProviderId,
    lastEffectiveDate,
});

// ---- Care givers ----

export const fetchCareGiversList = async (recordType, patientId) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.careGivers}/${recordType}/${patientId}?id=${getLoggedInUser()?.userId || ''}`);
    return response?.status === 'success' ? response.data || [] : [];
};

export const fetchCareGiverTypes = async () => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.careGiverTypes}?id=${getLoggedInUser()?.userId || ''}`);
    const data = response?.status === 'success' ? response.data || {} : {};
    const typeList = [];
    const relationshipList = [];
    Object.values(data).forEach((item) => {
        (item.subGroupCode ? relationshipList : typeList).push(item);
    });
    return { typeList, relationshipList };
};

export const saveCareGiver = (payload) => apiPost(ENDPOINTS.patientProfile.careGivers, payload);

export const deleteCareGiver = ({ patientId, careGiverId, recordType, lastEffectiveDate }) => apiPost(ENDPOINTS.patientProfile.careGiversInvalid, {
    patientId,
    careGiverId,
    activeFlag: recordType === 'active' ? 'Y' : 'N',
    recordType,
    lastEffectiveDate,
});

// ---- Mobile access / preferred day & time ----

export const saveMobileAccess = (payload) => postDataFormPayload(ENDPOINTS.patientProfile.updateMobileAccess, payload);

export const savePreferredDayTime = (payload) => postDataFormPayload(ENDPOINTS.patientProfile.updatePreferredDayTime, payload);

// ---- Patient deactivation ----

export const fetchDeactivationReasons = async (patientId) => {
    const response = await apiGet(`${ENDPOINTS.patientProfile.deactivateReasons}?id=${patientId}`);
    const data = response?.status === 'success' ? response.data : null;
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
};

export const deactivatePatientUser = ({ userId, code, notes, exitForm }) => apiPostMultipart(ENDPOINTS.patientProfile.deactivateUser, {
    userId, code, notes, exitForm: exitForm || '',
});

// ---- Small shared helpers ----

/** Legacy inputmask "(999)-999-9999". */
export const formatPhoneInput = (value = '') => {
    const digits = String(value).replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const convert24To12 = (time) => {
    if (!time) return '';
    const parsed = moment(time, ['HH:mm:ss', 'HH:mm'], true);
    return parsed.isValid() ? parsed.format('hh:mm A') : time;
};

export const convert12To24 = (time) => {
    if (!time) return '';
    const parsed = moment(time, ['hh:mm A', 'h:mm A'], true);
    return parsed.isValid() ? parsed.format('HH:mm') : '';
};

/** BMI from weight (lbs) and height (inches); legacy calculatePatientBMI. */
export const calculatePatientBMI = (weight, height) => {
    const weightValue = parseFloat(weight);
    const heightValue = parseFloat(height);
    if (!weightValue || !heightValue) return '';
    return ((703 * weightValue) / (heightValue * heightValue)).toFixed(2);
};

const patientProfileService = {
    refreshPatientDetails,
    getPatientDetails,
    fetchDemographicsHumCodes,
    fetchProfileTimeZones,
    fetchEthnicityLookup,
    fetchRaceLookupPage,
    fetchLanguageLookupPage,
    fetchOccupationLookupPage,
    fetchOccupationIndustryLookupPage,
    validateUniquePatientField,
    saveDemographics,
    buildDemographicsSavePayload,
    fetchCommunicationMethods,
    savePhoneInformation,
    sendPhoneVerificationCode,
    validatePhoneOtp,
    buildPhoneInformationSavePayload,
    fetchPreviousAddressList,
    validateZipCode,
    saveAddressInformation,
    fetchCarePlanDetails,
    fetchPhysiciansList,
    fetchCliniciansList,
    fetchOrSaveCareTeam,
    fetchSpecialtyProvidersList,
    fetchTaxonomyLookup,
    validateSpecialtyProviderUnique,
    saveSpecialtyProvider,
    deleteSpecialtyProvider,
    fetchCareGiversList,
    fetchCareGiverTypes,
    saveCareGiver,
    deleteCareGiver,
    saveMobileAccess,
    savePreferredDayTime,
    fetchDeactivationReasons,
    deactivatePatientUser,
    formatPhoneInput,
    convert24To12,
    convert12To24,
    calculatePatientBMI,
};
export default patientProfileService;
