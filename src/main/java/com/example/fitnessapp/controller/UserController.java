package com.example.fitnessapp.controller;

import com.example.fitnessapp.dto.UserDto;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        return ResponseEntity.ok(new UserDto(user));
    }

    @GetMapping("/clients")
    public ResponseEntity<List<UserDto>> getMyClients() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = auth.getName(); // this is the email
        
        User coach = userRepository.findByEmail(currentPrincipalName).orElseThrow();
        
        // This is a bit unoptimized without a specific query, but fine for H2 mock
        List<User> allUsers = userRepository.findAll();
        List<UserDto> clients = allUsers.stream()
                .filter(u -> u.getCoach() != null && u.getCoach().getId().equals(coach.getId()))
                .map(UserDto::new)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(clients);
    }

    @PostMapping("/create-client")
    public ResponseEntity<?> createClient(@RequestBody UserDto clientDto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = auth.getName(); // coach email
        User coach = userRepository.findByEmail(currentPrincipalName).orElseThrow();
        
        String name = clientDto.getName() == null ? "" : clientDto.getName().trim();
        String[] parts = name.split("\\s+");
        if (parts.length < 3) {
            return ResponseEntity.badRequest().body("Se requiere el nombre y ambos apellidos.");
        }
        
        String username;
        try {
            username = generateUniqueUsername(name);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        
        User client = new User();
        client.setName(name);
        client.setEmail(clientDto.getEmail());
        client.setGoal(clientDto.getGoal());
        client.setReviewFrequency(clientDto.getReviewFrequency() != null ? clientDto.getReviewFrequency() : "Semanal");
        client.setStatus("Activo");
        client.setRole(com.example.fitnessapp.model.Role.PREMIUM_CLIENT);
        client.setCoach(coach);
        
        client.setUsername(username);
        client.setPasswordHash(passwordEncoder.encode(username));
        client.setMustChangePassword(true);
        
        userRepository.save(client);
        
        return ResponseEntity.ok(new UserDto(client));
    }

    private String generateUniqueUsername(String fullName) {
        String normalized = java.text.Normalizer.normalize(fullName.toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("[^a-z\\s]", "");
        
        String[] parts = normalized.split("\\s+");
        if (parts.length < 3) {
            throw new IllegalArgumentException("Se requiere el nombre y ambos apellidos.");
        }
        
        String firstSurname = parts[parts.length - 2];
        String secondSurname = parts[parts.length - 1];
        
        StringBuilder initialsBuilder = new StringBuilder();
        for (int i = 0; i < parts.length - 2; i++) {
            if (!parts[i].isEmpty()) {
                initialsBuilder.append(parts[i].charAt(0));
            }
        }
        String initials = initialsBuilder.toString();
        
        int targetLen = 7;
        int surnameLen = targetLen - initials.length();
        if (surnameLen < 1) {
            surnameLen = 1;
        }
        
        String baseSurnamePart = firstSurname.substring(0, Math.min(firstSurname.length(), surnameLen));
        String username = initials + baseSurnamePart;
        
        int extraCharIndex = surnameLen;
        while (userRepository.existsByUsername(username) || userRepository.findByEmail(username).isPresent()) {
            if (extraCharIndex < firstSurname.length()) {
                username = initials + firstSurname.substring(0, extraCharIndex + 1);
                extraCharIndex++;
            } else {
                int secondSurnameIndex = username.length() - initials.length() - firstSurname.length();
                if (secondSurnameIndex < secondSurname.length()) {
                    username = initials + firstSurname + secondSurname.substring(0, secondSurnameIndex + 1);
                } else {
                    int num = 1;
                    String temp = username;
                    while (userRepository.existsByUsername(temp + num) || userRepository.findByEmail(temp + num).isPresent()) {
                        num++;
                    }
                    username = temp + num;
                    break;
                }
            }
        }
        
        return username;
    }

    @PutMapping("/clients/{clientId}")
    public ResponseEntity<?> updateClient(@PathVariable java.util.UUID clientId, @RequestBody UserDto clientDto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = auth.getName(); // coach email
        User coach = userRepository.findByEmail(currentPrincipalName).orElseThrow();
        
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));
                
        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            return ResponseEntity.status(403).body("No tienes permisos para modificar este cliente.");
        }
        
        if (clientDto.getReviewFrequency() != null) {
            client.setReviewFrequency(clientDto.getReviewFrequency());
        }
        if (clientDto.getProgressionStrategy() != null) {
            client.setProgressionStrategy(clientDto.getProgressionStrategy());
        }
        if (clientDto.getGoal() != null) {
            client.setGoal(clientDto.getGoal());
        }
        if (clientDto.getStatus() != null) {
            client.setStatus(clientDto.getStatus());
        }
        if (clientDto.getRoutineJson() != null) {
            client.setRoutineJson(clientDto.getRoutineJson());
        }
        
        userRepository.save(client);
        return ResponseEntity.ok(new UserDto(client));
    }
}
