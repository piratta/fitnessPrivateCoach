// Chat utility using localStorage as message store
// Both coach and client read/write from the same keys

const CHAT_PREFIX = 'prvtfitness_chat_';

export function getChatMessages(clientEmail) {
  try {
    const stored = localStorage.getItem(CHAT_PREFIX + clientEmail);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export function saveChatMessages(clientEmail, messages) {
  localStorage.setItem(CHAT_PREFIX + clientEmail, JSON.stringify(messages));
}

export function addChatMessage(clientEmail, sender, text) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const messages = getChatMessages(clientEmail);
  messages.push({ sender, text, time: `Hoy ${timeStr}` });
  saveChatMessages(clientEmail, messages);
  
  // Dispatch event for live updates
  window.dispatchEvent(new CustomEvent('chatUpdated', { detail: { clientEmail, sender } }));
  
  return messages;
}

// Initialize default messages for a client (only if not already set)
export function initChatIfEmpty(clientEmail, defaultMessages) {
  const existing = localStorage.getItem(CHAT_PREFIX + clientEmail);
  if (!existing || existing === '[]') {
    saveChatMessages(clientEmail, defaultMessages);
  }
}

// Listen for cross-tab storage events
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith(CHAT_PREFIX) && e.newValue) {
    try {
      const clientEmail = e.key.substring(CHAT_PREFIX.length);
      const messages = JSON.parse(e.newValue);
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        window.dispatchEvent(new CustomEvent('chatUpdated', { detail: { clientEmail, sender: lastMsg.sender } }));
      }
    } catch (err) {}
  }
});
