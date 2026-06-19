package com.fitnessApp.feature.user;

import com.fitnessApp.feature.progress.ProgressLog;
import com.fitnessApp.feature.progress.ProgressLogRepository;
import com.fitnessApp.feature.review.ReviewImage;
import com.fitnessApp.feature.review.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProgressLogRepository progressLogRepository;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();

    public User getUserByPrincipal(String principal) {
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
    }

    public List<UserDto> getMyClients(String coachEmail) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow();
        return userRepository.findAll().stream()
                .filter(u -> u.getCoach() != null && u.getCoach().getId().equals(coach.getId()))
                .map(UserDto::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public User createClient(String coachEmail, UserDto clientDto) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow();

        String name = clientDto.getName() == null ? "" : clientDto.getName().trim();
        if (name.split("\\s+").length < 3) {
            throw new IllegalArgumentException("Se requiere el nombre y ambos apellidos.");
        }

        String username = generateUniqueUsername(name);

        User client = new User();
        client.setName(name);
        client.setEmail(clientDto.getEmail());
        client.setGoal(clientDto.getGoal());
        client.setReviewFrequency(clientDto.getReviewFrequency() != null ? clientDto.getReviewFrequency() : "Semanal");
        client.setStatus("Activo");
        client.setRole(Role.PREMIUM_CLIENT);
        client.setCoach(coach);
        client.setUsername(username);
        client.setPasswordHash(passwordEncoder.encode(username));
        client.setMustChangePassword(true);

        return userRepository.save(client);
    }

    public User updateClient(String coachEmail, UUID clientId, UserDto clientDto) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow();
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos.");
        }

        if (clientDto.getName() != null && !clientDto.getName().isBlank()) client.setName(clientDto.getName().trim());
        if (clientDto.getEmail() != null && !clientDto.getEmail().isBlank() && !clientDto.getEmail().equalsIgnoreCase(client.getEmail())) {
            String newEmail = clientDto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(client.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email en uso.");
            });
            client.setEmail(newEmail);
        }
        if (clientDto.getReviewFrequency() != null) client.setReviewFrequency(clientDto.getReviewFrequency());
        if (clientDto.getProgressionStrategy() != null) client.setProgressionStrategy(clientDto.getProgressionStrategy());
        if (clientDto.getGoal() != null) client.setGoal(clientDto.getGoal());
        if (clientDto.getStatus() != null) client.setStatus(clientDto.getStatus());
        if (clientDto.getRoutineJson() != null) client.setRoutineJson(clientDto.getRoutineJson());

        return userRepository.save(client);
    }

    public String resetClientPassword(String coachEmail, UUID clientId, User[] clientRef) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow();
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado."));

        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos.");
        }

        String tempPassword = generateTempPassword();
        client.setPasswordHash(passwordEncoder.encode(tempPassword));
        client.setMustChangePassword(true);
        clientRef[0] = userRepository.save(client);
        return tempPassword;
    }

    public User updateMe(String principalEmail, UserDto dto) {
        User user = userRepository.findByEmail(principalEmail).orElseThrow();

        if (dto.getName() != null && !dto.getName().isBlank()) user.setName(dto.getName().trim());
        if (dto.getLastName() != null) {
            String ln = dto.getLastName().trim();
            if (ln.isEmpty() || ln.equalsIgnoreCase(user.getUsername())) user.setLastName(null);
            else user.setLastName(ln);
        }
        if (dto.getBirthDate() != null) user.setBirthDate(dto.getBirthDate());
        if (dto.getEmail() != null && !dto.getEmail().isBlank() && !dto.getEmail().equalsIgnoreCase(user.getEmail())) {
            String newEmail = dto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email en uso.");
            });
            user.setEmail(newEmail);
        }
        if (dto.getRoutineJson() != null) user.setRoutineJson(dto.getRoutineJson());

        return userRepository.save(user);
    }

    @Transactional
    public User completeOnboarding(String principal, Map<String, Object> body) {
        User user = getUserByPrincipal(principal);
        LocalDate today = LocalDate.now();
        ProgressLog log = progressLogRepository.findByClientAndLogDate(user, today).orElseGet(ProgressLog::new);

        log.setClient(user);
        log.setLogDate(today);
        if (body != null) {
            if (body.get("weight") != null) log.setWeight(readDouble(body.get("weight")));
            if (body.get("waist") != null) log.setWaist(readDouble(body.get("waist")));
            // Add other measurements if needed
        }
        progressLogRepository.save(log);

        LocalDateTime now = LocalDateTime.now();
        user.setOnboardingCompleted(true);
        user.setLastReviewDate(now);
        user.setNextReviewAt(reviewService.computeNextReviewAt(user, now));
        return userRepository.save(user);
    }

    public ReviewImage uploadInitialPhoto(String principal, String view, MultipartFile file) {
        User user = getUserByPrincipal(principal);
        return reviewService.addStandaloneImage(user, view, true, file);
    }

    // --- Private Helper Methods ---

    private String generateUniqueUsername(String fullName) {
        String normalized = java.text.Normalizer.normalize(fullName.toLowerCase(), java.text.Normalizer.Form.NFD).replaceAll("[^a-z\\s]", "");
        String[] parts = normalized.split("\\s+");
        String firstSurname = parts[parts.length - 2];

        StringBuilder initialsBuilder = new StringBuilder();
        for (int i = 0; i < parts.length - 2; i++) {
            if (!parts[i].isEmpty()) initialsBuilder.append(parts[i].charAt(0));
        }
        String initials = initialsBuilder.toString();
        int surnameLen = Math.max(1, 7 - initials.length());
        String username = initials + firstSurname.substring(0, Math.min(firstSurname.length(), surnameLen));
        int num = 1;
        String temp = username;
        while (userRepository.existsByUsernameIgnoreCase(username) || userRepository.findByEmailIgnoreCase(username).isPresent()) {
            username = temp + num;
            num++;
        }
        return username;
    }

    private String generateTempPassword() {
        String alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return sb.toString();
    }

    private Double readDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(value.toString().trim().replace(',', '.')); }
        catch (NumberFormatException e) { return null; }
    }
}