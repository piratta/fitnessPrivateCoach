package com.fitnessApp.core.websocket;

import com.fitnessApp.feature.chat.ChatMessageDto;
import com.fitnessApp.feature.chat.ChatMessage;
import com.fitnessApp.feature.user.Role;
import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.chat.ChatMessageRepository;
import com.fitnessApp.feature.user.UserRepository;
import com.fitnessApp.core.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Map: User Email -> Set of active WebSocketSessions
    private final Map<String, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String query = session.getUri().getQuery();
        String token = null;
        if (query != null) {
            for (String param : query.split("&")) {
                String[] keyValue = param.split("=");
                if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                    token = keyValue[1];
                    break;
                }
            }
        }

        if (StringUtils.hasText(token) && tokenProvider.validateJwtToken(token)) {
            String email = tokenProvider.getUsernameFromJwtToken(token);
            session.getAttributes().put("email", email);
            userSessions.computeIfAbsent(email, k -> ConcurrentHashMap.newKeySet()).add(session);
            System.out.println("WebSocket connection established for user: " + email);
        } else {
            System.err.println("WebSocket connection rejected: invalid token");
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String email = (String) session.getAttributes().get("email");
        if (email != null) {
            Set<WebSocketSession> sessions = userSessions.get(email);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(email);
                }
            }
            System.out.println("WebSocket connection closed for user: " + email);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String senderEmail = (String) session.getAttributes().get("email");
        if (senderEmail == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        try {
            ChatMessagePayload payload = objectMapper.readValue(message.getPayload(), ChatMessagePayload.class);
            if (payload == null || !StringUtils.hasText(payload.getText())) {
                return;
            }

            User sender = userRepository.findByEmail(senderEmail).orElseThrow();
            User receiver;
            if (sender.getRole() == Role.PREMIUM_CLIENT) {
                receiver = sender.getCoach();
            } else {
                if (!StringUtils.hasText(payload.getRecipientEmail())) {
                    System.err.println("WebSocket message error: missing recipientEmail from coach");
                    return;
                }
                receiver = userRepository.findByEmail(payload.getRecipientEmail()).orElseThrow();
            }

            if (receiver == null) {
                System.err.println("WebSocket message error: receiver (coach or client) not found");
                return;
            }

            // Save to database
            ChatMessage msg = new ChatMessage();
            msg.setSender(sender);
            msg.setReceiver(receiver);
            msg.setMessageText(payload.getText());
            chatMessageRepository.save(msg);

            // Create and format DTO
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
            String senderPerspective = sender.getRole() == Role.PREMIUM_CLIENT ? "client" : "coach";
            ChatMessageDto dto = new ChatMessageDto(
                senderPerspective, 
                msg.getMessageText(), 
                "Hoy " + msg.getSentAt().format(formatter)
            );

            // Broadcast message
            String clientEmail = sender.getRole() == Role.PREMIUM_CLIENT ? sender.getEmail() : receiver.getEmail();
            broadcastMessage(clientEmail, dto);

        } catch (Exception e) {
            System.err.println("Error processing WebSocket message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void broadcastMessage(String clientEmail, ChatMessageDto dto) {
        try {
            User client = userRepository.findByEmail(clientEmail).orElseThrow();
            User coach = client.getCoach();
            String coachEmail = coach != null ? coach.getEmail() : null;

            // Prepare wrapper payload
            Map<String, Object> broadcastMap = new HashMap<>();
            broadcastMap.put("sender", dto.getSender());
            broadcastMap.put("text", dto.getText());
            broadcastMap.put("time", dto.getTime());
            broadcastMap.put("clientEmail", clientEmail);

            String json = objectMapper.writeValueAsString(broadcastMap);
            TextMessage textMessage = new TextMessage(json);

            // Send to client
            sendToUser(clientEmail, textMessage);

            // Send to coach
            if (coachEmail != null) {
                sendToUser(coachEmail, textMessage);
            }
        } catch (Exception e) {
            System.err.println("Error broadcasting WebSocket message: " + e.getMessage());
        }
    }

    private void sendToUser(String email, TextMessage message) {
        Set<WebSocketSession> sessions = userSessions.get(email);
        if (sessions != null) {
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        System.err.println("Error sending WebSocket message to " + email + ": " + e.getMessage());
                    }
                }
            }
        }
    }

    // Helper class for parsing WebSocket incoming messages
    public static class ChatMessagePayload {
        private String recipientEmail;
        private String text;

        public ChatMessagePayload() {}

        public String getRecipientEmail() { return recipientEmail; }
        public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }
}
