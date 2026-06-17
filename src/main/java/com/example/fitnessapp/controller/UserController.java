package com.example.fitnessapp.controller;

import com.example.fitnessapp.dto.UserDto;
import com.example.fitnessapp.model.ProgressLog;
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

    /**
     * Diagnostic endpoint. Returns who the server thinks is calling without
     * touching the database. If this returns 200 with the principal but
     * {@code POST /api/users/me/complete-onboarding} returns 401, the deploy
     * is missing the onboarding endpoint.
     */
    @GetMapping("/me/whoami")
    public ResponseEntity<Map<String, Object>> whoami() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> body = new HashMap<>();
        body.put("authenticated", auth != null && auth.isAuthenticated());
        body.put("principal", auth != null ? auth.getName() : null);
        body.put("authorities", auth != null ? auth.getAuthorities().toString() : null);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String principal = auth.getName();
        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
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
                    while (userRepository.existsByUsername(temp + num)
                            || userRepository.findByEmail(temp + num).isPresent()) {
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
     * Coach regenerates a client's password. Returns the new temporary credentials
     * so the UI can
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

    /**
     * Trainer (or any user) edits their own profile: name, last name, birth date
     * and email.
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UserDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getLastName() != null) {
            String ln = dto.getLastName().trim();
            // Treat blank or the username itself as 'no surname'.
            if (ln.isEmpty() || ln.equalsIgnoreCase(user.getUsername())) {
                user.setLastName(null);
            } else {
                user.setLastName(ln);
            }
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
        // Allow the client to persist a "moved to today" routine rearrangement. The coach can
        // overwrite this when assigning a new plan.
        if (dto.getRoutineJson() != null) {
            user.setRoutineJson(dto.getRoutineJson());
        }
        userRepository.save(user);
        return ResponseEntity.ok(new UserDto(user));
    }

    /**
     * First-login questionnaire: stores the client's initial measurements as the
     * first ProgressLog
     * (UPSERT by day), marks onboarding as done and arms the review lock so the
     * first review only
     * becomes available after the configured frequency.
     */
    @PostMapping("/me/complete-onboarding")
    @Transactional
    public ResponseEntity<?> completeOnboarding(@RequestBody(required = false) Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Sesión expirada.");
        }
        // Auth principal can be email or username depending on how the JWT was generated.
        String principal = auth.getName();
        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));

        LocalDate today = LocalDate.now();
        ProgressLog log = progressLogRepository.findByClientAndLogDate(user, today)
                .orElseGet(ProgressLog::new);
        log.setClient(user);
        log.setLogDate(today);
        if (body != null) {
            Double weight = readDouble(body.get("weight"));
            Double waist  = readDouble(body.get("waist"));
            Double hip    = readDouble(body.get("hip"));
            Double neck   = readDouble(body.get("neck"));
            Double biceps = readDouble(body.get("biceps"));
            Double leg    = readDouble(body.get("leg"));
            Double chest   = readDouble(body.get("chest"));
            Double calf    = readDouble(body.get("calf"));
            Double forearm = readDouble(body.get("forearm"));
            Double back    = readDouble(body.get("back"));
            if (weight != null) log.setWeight(weight);
            if (waist != null)  log.setWaist(waist);
            if (hip != null)    log.setHip(hip);
            if (neck != null)   log.setNeck(neck);
            if (biceps != null) log.setBiceps(biceps);
            if (leg != null)    log.setLeg(leg);
            if (chest != null)   log.setChest(chest);
            if (calf != null)    log.setCalf(calf);
            if (forearm != null) log.setForearm(forearm);
            if (back != null)    log.setBack(back);
        }
        progressLogRepository.save(log);

        LocalDateTime now = LocalDateTime.now();
        user.setOnboardingCompleted(true);
        user.setLastReviewDate(now);
        user.setNextReviewAt(reviewService.computeNextReviewAt(user, now));
        userRepository.save(user);

        return ResponseEntity.ok(new UserDto(user));
    }

    private static Double readDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.doubleValue();
        String s = value.toString().trim();
        if (s.isEmpty()) return null;
        try { return Double.parseDouble(s.replace(',', '.')); } catch (NumberFormatException e) { return null; }
    }

    /**
     * Uploads one of the four onboarding pictures (front/left/right/back). They are stored as
     * standalone images (no review attached) and show up in the gallery + future review
     * comparisons as baseline references.
     */
    @PostMapping(value = "/me/initial-photo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadInitialPhoto(@org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                                @org.springframework.web.bind.annotation.RequestParam(value = "view", required = false) String view) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Sesión expirada.");
        }
        String principal = auth.getName();
        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
        com.example.fitnessapp.model.ReviewImage saved = reviewService.addStandaloneImage(user, view, file);
        Map<String, Object> body = new HashMap<>();
        body.put("id", saved.getId());
        body.put("view", saved.getView());
        return ResponseEntity.ok(body);
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
