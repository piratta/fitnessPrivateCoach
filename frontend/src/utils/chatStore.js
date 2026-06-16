import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/api/chat`;

let socket = null;
const listeners = new Set();

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
        console.error("Failed to send message via HTTP");
        return null;
    }
    const updatedMessage = await response.json();
    
    // Dispatch event for live updates (fallback/legacy)
    window.dispatchEvent(new CustomEvent('chatUpdated', { detail: { clientEmail, sender: updatedMessage.sender } }));
    
    return updatedMessage;
  } catch (error) {
    console.error("Error sending chat message via HTTP:", error);
    return null;
  }
}

// Legacy function no longer needed, keeping signature empty to prevent crashes
export function initChatIfEmpty(clientEmail, defaultMessages) {
}

// Establish shared WebSocket connection
export function connectWebSocket(onMessage) {
  listeners.add(onMessage);
  
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const token = localStorage.getItem('token');
  if (!token) return null;

  // Dynamically resolve WS/WSS URL from API_BASE_URL
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  const wsUrl = `${wsBase}/ws/chat?token=${token}`;

  console.log("Connecting to WebSocket:", wsUrl);
  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      listeners.forEach(listener => listener(data));
      
      // Also dispatch the legacy custom event for CoachDashboard unread count logic
      window.dispatchEvent(new CustomEvent('chatUpdated', { 
        detail: { clientEmail: data.clientEmail, sender: data.sender } 
      }));
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed, attempting reconnect in 3s...");
    socket = null;
    setTimeout(() => {
      if (listeners.size > 0) {
        connectWebSocket(onMessage);
      }
    }, 3000);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (socket) {
      socket.close(); // ✅ Ahora es seguro
    }
  };

  return socket;
}

// Disconnect listener and optionally close WebSocket connection if no listeners remain
export function disconnectWebSocket(onMessage) {
  listeners.delete(onMessage);
  if (listeners.size === 0 && socket) {
    console.log("Closing WebSocket since all listeners disconnected");
    socket.close();
    socket = null;
  }
}

// Send message via WebSocket, returns true if successful, false if fallback is needed
export function sendWebSocketMessage(recipientEmail, text) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ recipientEmail, text }));
    return true;
  }
  return false;
}

