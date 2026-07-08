import ENDPOINTS from './endpoints';
import { apiGet, apiPost } from './apiClient';
import { chatPostForm, chatAuthExtras } from './chatClient';
import { getLoggedInUser } from './authService';

/**
 * Message Center — Chat service.
 *
 * Chat data spans two backends (see endpoints.messageCenter):
 * - signal microservice (chatClient, form-urlencoded, token+apiUrl in body):
 *   dashboard user list, individual message history, message save, media, old
 *   message encryption, first-time-user key setup.
 * - standard backend (apiClient, JSON): contact-user search, legacy message
 *   migration fetch, unread status update, notification count.
 *
 * Every request shape mirrors the legacy `messageCenterUtility` param builders +
 * `apiUtility` methods verbatim.
 */

const loggedInUserId = () => getLoggedInUser()?.userId;

// ---- request-param builders (legacy messageCenterUtility / *ChatSelectors) ----

/** constructDashboardRequestParam — recent-chat dashboard (length 7 per legacy). */
export const buildDashboardParam = ({ start = 0, search = '' }) => ({
    start,
    length: 7,
    distributorRole: '',
    distributorName: search || '',
    ...chatAuthExtras(),
});

/** getDistributedUserMessageRequestParam — individual chat history (length 10). */
export const buildUserMessageParam = ({ userId, start = 0 }) => ({
    userId,
    start,
    length: 10,
    ...chatAuthExtras(),
});

/** getIndividualChatDetailsRequest — send a message (text/file/audio). */
export const buildSendMessageParam = ({ message, fileDetails = [], attachmentType = null, selectedUserId }) => ({
    loggedInUserId: loggedInUserId(),
    selectedUserId,
    ...chatAuthExtras(),
    attachmentType,
    message,
    fileDetails,
});

/** oldMessageMigrationRequestParam — fetch legacy messages to migrate (JSON body). */
export const buildOldMessageMigrationParam = (selectedUserPersonId) => ({
    draw: 0,
    isMigratedFlag: 'N',
    length: 0,
    order: { column: 'desc', type: 'messageId' },
    personId: selectedUserPersonId,
    start: 0,
});

/** oldMessageEncryptionRequestParam — encrypt migrated messages (signal, form). */
export const buildOldMessageEncryptionParam = (oldMigrationData, selectedUserId) => ({
    oldMigrationData,
    loggedInUserId: loggedInUserId(),
    selectedUserId,
    ...chatAuthExtras(),
});

/** updateUnReadMsgCountParam — mark messages read (JSON body). */
export const buildUnreadUpdateParam = (unreadMessageIds) => ({
    statusCode: 'READ',
    statusFlag: 'Y',
    messageDetailsIdList: unreadMessageIds,
});

/** userAndMessageParams — first-time-user key details (signal, form). */
export const buildFirstTimeUserParam = (selectorId = null) => ({
    userId: selectorId || loggedInUserId(),
    ...chatAuthExtras(),
});

/** contactUsersListParam — new-chat user search (standard, JSON). */
export const buildContactUsersParam = ({ search = '', role = '' }) => ({
    search,
    filter: { role: role || '' },
    keyType: 'ECHAT',
    deviceType: '',
    start: 0,
    length: 100,
});

// ---- signal microservice calls ----

export const fetchChatDashboard = (params) => chatPostForm(ENDPOINTS.messageCenter.signal.dashboard, buildDashboardParam(params));

export const checkFirstTimeUser = (selectorId) => chatPostForm(ENDPOINTS.messageCenter.signal.loggedInUserKeyDetails, buildFirstTimeUserParam(selectorId));

export const fetchUserMessages = (params) => chatPostForm(ENDPOINTS.messageCenter.signal.userMessageEntries, buildUserMessageParam(params));

export const saveChatMessage = (params) => chatPostForm(ENDPOINTS.messageCenter.signal.messageSave, buildSendMessageParam(params));

export const encryptOldMessages = (oldMigrationData, selectedUserId) => chatPostForm(ENDPOINTS.messageCenter.signal.oldMessageData, buildOldMessageEncryptionParam(oldMigrationData, selectedUserId));

export const fetchChatMedia = (selectedUserId) => chatPostForm(ENDPOINTS.messageCenter.signal.mediaAttachments, {
    distributionUserId: parseInt(selectedUserId, 10),
    ...chatAuthExtras(),
});

// ---- standard backend calls ----

export const fetchOldMessagesForMigration = (selectedUserPersonId) => apiPost(ENDPOINTS.messageCenter.standard.oldMessageMigration, buildOldMessageMigrationParam(selectedUserPersonId));

export const fetchContactUsers = (params) => apiPost(ENDPOINTS.messageCenter.standard.contactUsersList, buildContactUsersParam(params));

export const updateUnreadMessageCount = (unreadMessageIds) => apiPost(ENDPOINTS.messageCenter.standard.updateUnreadCount, buildUnreadUpdateParam(unreadMessageIds));

export const fetchNotificationCount = () => apiGet(`${ENDPOINTS.messageCenter.standard.notificationCount}&id=${loggedInUserId() || ''}`);

const messageCenterService = {
    buildDashboardParam,
    buildUserMessageParam,
    buildSendMessageParam,
    buildContactUsersParam,
    fetchChatDashboard,
    checkFirstTimeUser,
    fetchUserMessages,
    saveChatMessage,
    encryptOldMessages,
    fetchChatMedia,
    fetchOldMessagesForMigration,
    fetchContactUsers,
    updateUnreadMessageCount,
    fetchNotificationCount,
};
export default messageCenterService;
