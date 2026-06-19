package com.fitnessApp.feature.chat;

import com.fitnessApp.feature.user.Role;
import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import com.fitnessApp.core.websocket.ChatWebSocketHandler;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatWebSocketHandler chatWebSocketHandler;
    private final ChatMapper chatMapper;

    @GetMapping("/{clientEmail}")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable String clientEmail) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        User client = userRepository.findByEmail(clientEmail).orElseThrow();

        // Si el usuario actual es cliente, y está consultando su propio chat con el entrenador
        User coach;
        User theClient;
        if (currentUser.getRole() == Role.PREMIUM_CLIENT) {
            theClient = currentUser;
            coach = currentUser.getCoach();
        } else {
            theClient = client;
            coach = currentUser; // el entrenador es el que hace la request
        }

        if (coach == null) {
            return ResponseEntity.badRequest().build();
        }

        List<ChatMessage> messages = chatMessageRepository.findChatHistory(theClient, coach);

        List<ChatMessageDto> dtos = messages.stream()
                .map(chatMapper::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{clientEmail}")
    public ResponseEntity<ChatMessageDto> sendMessage(@PathVariable String clientEmail, @RequestBody ChatMessageDto request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        User receiver;
        if (currentUser.getRole() == Role.PREMIUM_CLIENT) {
            receiver = currentUser.getCoach();
        } else {
            receiver = userRepository.findByEmail(clientEmail).orElseThrow();
        }

        ChatMessage msg = new ChatMessage();
        msg.setSender(currentUser);
        msg.setReceiver(receiver);
        msg.setMessageText(request.getText());
        
        chatMessageRepository.save(msg);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        String senderPerspective = currentUser.getRole() == Role.PREMIUM_CLIENT ? "client" : "coach";
        ChatMessageDto dto = new ChatMessageDto(senderPerspective, msg.getMessageText(), "Hoy " + msg.getSentAt().format(formatter));

        // Broadcast to WebSocket connections
        String clientEmailToUse = currentUser.getRole() == Role.PREMIUM_CLIENT ? currentUser.getEmail() : receiver.getEmail();
        chatWebSocketHandler.broadcastMessage(clientEmailToUse, dto);

        return ResponseEntity.ok(dto);
    }
}
