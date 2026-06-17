package com.fitnessApp.fitnessapp.controller;

import com.fitnessApp.fitnessapp.dto.ChatMessageDto;
import com.fitnessApp.fitnessapp.model.ChatMessage;
import com.fitnessApp.fitnessapp.model.Role;
import com.fitnessApp.fitnessapp.model.User;
import com.fitnessApp.fitnessapp.repository.ChatMessageRepository;
import com.fitnessApp.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import com.fitnessApp.fitnessapp.websocket.ChatWebSocketHandler;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatWebSocketHandler chatWebSocketHandler;

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

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        List<ChatMessageDto> dtos = messages.stream().map(msg -> {
            String senderPerspective = msg.getSender().getId().equals(currentUser.getId()) 
                    ? (currentUser.getRole() == Role.PREMIUM_CLIENT ? "client" : "coach")
                    : (currentUser.getRole() == Role.PREMIUM_CLIENT ? "coach" : "client");
            
            String timeStr = "Hoy " + msg.getSentAt().format(formatter);
            return new ChatMessageDto(senderPerspective, msg.getMessageText(), timeStr);
        }).collect(Collectors.toList());

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
