import { useCallback, useState } from 'react';
import MessageCenterUserList from './MessageCenterUserList';
import MessageCenterChatView from './MessageCenterChatView';
import MessageCenterNewChatDialog from './MessageCenterNewChatDialog';

/**
 * Message Center → Chat (legacy ehr-text-message-center + ehr-message-center-user-list).
 * Two-pane: recent-users list (left) + individual conversation (right). Sending or
 * reading a message bumps refreshKey so the list re-fetches (last message / unread),
 * mirroring the legacy "EhrTextMessageCenterUserList:UpdateUserDetails" event. The
 * "New Chat" (+) button opens a contact search that starts a fresh conversation.
 *
 * NOTE: the media side panel and header CTC dropdown remain later sub-phases.
 */
const MessageCenterChat = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [newChatOpen, setNewChatOpen] = useState(false);

    const refreshList = useCallback(() => setRefreshKey((key) => key + 1), []);

    return (<div className="eum-ehr-message-center-container-wrapper">
      <div className="row mx-3 mc-chat-history-screen">
        <MessageCenterUserList
          selectedUserId={selectedUser?.userId}
          onSelect={setSelectedUser}
          onNewChat={() => setNewChatOpen(true)}
          refreshKey={refreshKey}/>
        <div className="col-md-9 mc-chat-detail-col ps-0">
          {selectedUser
            ? <MessageCenterChatView user={selectedUser} onMessageSent={refreshList}/>
            : <div className="mc-chat-empty-hint">Select a conversation to view messages.</div>}
        </div>
      </div>

      <MessageCenterNewChatDialog
        visible={newChatOpen}
        onHide={() => setNewChatOpen(false)}
        onSelectUser={(user) => { setSelectedUser(user); setNewChatOpen(false); }}/>
    </div>);
};
export default MessageCenterChat;
