package com.example.fitnessapp.controller;

import com.example.fitnessapp.dto.UserDto;
import com.example.fitnessapp.model.ProgressLog;
import com.example.fitnessapp.model.Role;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.repository.ProgressLogRepository;
import com.example.fitnessapp.repository.UserRepository;
import com.example.fitnessapp.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProgressLogRepository progressLogRepository;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();

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

        if (clientDto.getName() != null && !clientDto.getName().isBlank()) {
            client.setName(clientDto.getName().trim());
        }
        if (clientDto.getEmail() != null && !clientDto.getEmail().isBlank()
                && !clientDto.getEmail().equalsIgnoreCase(client.getEmail())) {
            String newEmail = clientDto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(client.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese email ya está en uso.");
                }
            });
            client.setEmail(newEmail);
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

    /**
     * Coach regenerates a client's password. Returns the new temporary credentials so the UI can
     * show them in a modal. Forces a password change on next login.
     */
    @PostMapping("/clients/{clientId}/reset-password")
    public ResponseEntity<?> resetClientPassword(@PathVariable java.util.UUID clientId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User coach = userRepository.findByEmail(auth.getName()).orElseThrow();

        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado."));
        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            return ResponseEntity.status(403).body("No tienes permisos para modificar este cliente.");
        }

        String tempPassword = generateTempPassword();
        client.setPasswordHash(passwordEncoder.encode(tempPassword));
        client.setMustChangePassword(true);
        userRepository.save(client);

        Map<String, String> body = new HashMap<>();
        body.put("username", client.getUsername());
        body.put("email", client.getEmail());
        body.put("password", tempPassword);
        return ResponseEntity.ok(body);
    }

    /** Trainer (or any user) edits their own profile: name, last name, birth date and email. */
    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UserDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getLastName() != null) {
            user.setLastName(dto.getLastName().trim());
        }
        if (dto.getBirthDate() != null) {
            user.setBirthDate(dto.getBirthDate());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()
                && !dto.getEmail().equalsIgnoreCase(user.getEmail())) {
            String newEmail = dto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese email ya está en uso.");
                }
            });
            user.setEmail(newEmail);
        }
        userRepository.save(user);
        return ResponseEntity.ok(new UserDto(user));
    }

    /**
     * First-login questionnaire: stores the client's initial measurements as the first ProgressLog
     * (UPSERT by day), marks onboarding as done and arms the review lock so the first review only
     * becomes available after the configured frequency.
     */
    @PostMapping("/me/complete-onboarding")
    @Transactional
    public ResponseEntity<?> completeOnboarding(@RequestBody ProgressLog measurements) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        LocalDate today = LocalDate.now();
        ProgressLog log = progressLogRepository.findByClientAndLogDate(user, today)
                .orElseGet(ProgressLog::new);
        log.setClient(user);
        log.setLogDate(today);
        if (measurements != null) {
            if (measurements.getWeight() != null) log.setWeight(measurements.getWeight());
            if (measurements.getWaist() != null)  log.setWaist(measurements.getWaist());
            if (measurements.getHip() != null)    log.setHip(measurements.getHip());
            if (measurements.getNeck() != null)   log.setNeck(measurements.getNeck());
            if (measurements.getBiceps() != null) log.setBiceps(measurements.getBiceps());
            if (measurements.getLeg() != null)    log.setLeg(measurements.getLeg());
        }
        progressLogRepository.save(log);

        LocalDateTime now = LocalDateTime.now();
        user.setOnboardingCompleted(true);
        user.setLastReviewDate(now);
        user.setNextReviewAt(reviewService.computeNextReviewAt(user, now));
        userRepository.save(user);

        return ResponseEntity.ok(new UserDto(user));
    }

    private String generateTempPassword() {
        // Avoid ambiguous characters (0/O, 1/l) so the coach can dictate it cleanly.
        String alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
