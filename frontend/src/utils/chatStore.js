import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/api/chat`;


function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function getChatMessages(clientEmail) {
  try {
    const response = await fetch(`${API_URL}/${clientEmail}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
}

export async function addChatMessage(clientEmail, text) {
  try {
    const response = await fetch(`${API_URL}/${clientEmail}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
        console.error("Failed to send message");
        return null;
    }
    const updatedMessages = await response.json();
    
    // Dispatch event for live updates
    window.dispatchEvent(new CustomEvent('chatUpdated', { detail: { clientEmail } }));
    
    return updatedMessages;
  } catch (error) {
    console.error("Error sending chat message:", error);
    return null;
  }
}

// Legacy function no longer needed, keeping signature empty to prevent crashes
export function initChatIfEmpty(clientEmail, defaultMessages) {
}
