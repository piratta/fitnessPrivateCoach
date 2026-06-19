package com.fitnessApp.feature.user;

import com.fitnessApp.feature.progress.ProgressLog;
import com.fitnessApp.feature.progress.ProgressLogRepository;
import com.fitnessApp.feature.review.ReviewImage;
import com.fitnessApp.feature.review.ReviewService;

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
import java.util.ArrayList;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fitnessApp.feature.workout.WorkoutSession;
import com.fitnessApp.feature.workout.WorkoutSessionRepository;
import lombok.RequiredArgsConstructor;
import com.fitnessApp.core.exception.ClientNotFoundException;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserService {

    private final UserRepository userRepository;

    private final ProgressLogRepository progressLogRepository;

    private final WorkoutSessionRepository workoutSessionRepository;

    private final ReviewService reviewService;

    private final PasswordEncoder passwordEncoder;

    private final UserMapper userMapper;

    private static final SecureRandom RANDOM = new SecureRandom();



    public User getUserByPrincipal(String principal) {
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
    }

    public List<UserDto> getMyClients(String coachEmail) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + coachEmail));
        List<User> clients = userRepository.findAll().stream()
                .filter(u -> u.getCoach() != null && u.getCoach().getId().equals(coach.getId()))
                .collect(Collectors.toList());

        ObjectMapper mapper = new ObjectMapper();
        List<UserDto> dtos = new ArrayList<>();

        for (User u : clients) {
            UserDto dto = userMapper.toDto(u);

            // 1. Get latest weight
            progressLogRepository.findTopByClientOrderByLogDateDesc(u)
                    .ifPresent(log -> dto.setCurrentWeight(log.getWeight() != null ? log.getWeight() : 0.0));

            // 2. Calculate compliance
            int compliance = 0;
            if (u.getRoutineJson() != null && !u.getRoutineJson().isEmpty()) {
                try {
                    Map<String, Object> routine = mapper.readValue(u.getRoutineJson(),
                            new TypeReference<Map<String, Object>>() {
                            });
                    int weeklySessions = routine.size();
                    if (weeklySessions > 0) {
                        int totalExpected = weeklySessions * 4; // last 28 days

                        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(28);
                        List<WorkoutSession> recentSessions = workoutSessionRepository
                                .findByClientIdOrderBySessionDateDesc(u.getId())
                                .stream()
                                .filter(s -> s.getSessionDate() != null && !s.getSessionDate().isBefore(thirtyDaysAgo))
                                .collect(Collectors.toList());

                        int completed = recentSessions.size();
                        compliance = (int) Math.round((completed * 100.0) / totalExpected);
                        compliance = Math.min(compliance, 100);
                    }
                } catch (Exception e) {
                    // ignore mapping error
                }
            }
            dto.setCompliance(compliance);

            dtos.add(dto);
        }
        return dtos;
    }

    @Transactional
    public User createClient(String coachEmail, UserDto clientDto) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + coachEmail));

        String firstName = clientDto.getName() == null ? "" : clientDto.getName().trim();
        String surnames = clientDto.getLastName() == null ? "" : clientDto.getLastName().trim();

        if (firstName.isEmpty()) {
            throw new IllegalArgumentException("Se requiere el nombre.");
        }
        if (surnames.split("\\s+").length < 2) {
            throw new IllegalArgumentException("Se requieren ambos apellidos.");
        }

        String username = generateUniqueUsername(firstName, surnames);

        User client = new User();
        client.setName(firstName);
        client.setLastName(surnames);
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
        User coach = userRepository.findByEmail(coachEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + coachEmail));
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos.");
        }

        userMapper.updateEntityFromDto(clientDto, client);
        
        // Manual updates that we want to keep specific control over, 
        // e.g. ignoring email if conflict, ignoring nulls handled by MapStruct IgnoreStrategy
        // Wait, MapStruct nullValuePropertyMappingStrategy = IGNORE takes care of nulls.
        // We just need to check email conflict:
        if (clientDto.getEmail() != null && !clientDto.getEmail().isBlank()
                && !clientDto.getEmail().equalsIgnoreCase(client.getEmail())) {
            String newEmail = clientDto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(client.getId()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email en uso.");
            });
            client.setEmail(newEmail);
        }

        if (clientDto.getRoutineJson() != null) {
            client.setRoutineUpdatedAt(java.time.LocalDateTime.now());
        }

        return userRepository.save(client);
    }

    @Transactional
    public void deleteClient(String coachEmail, UUID clientId) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + coachEmail));
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos.");
        }

        progressLogRepository.deleteAll(progressLogRepository.findByClientOrderByLogDateAsc(client));
        workoutSessionRepository
                .deleteAll(workoutSessionRepository.findByClientIdOrderBySessionDateDesc(client.getId()));

        userRepository.delete(client);
    }

    public String resetClientPassword(String coachEmail, UUID clientId, User[] clientRef) {
        User coach = userRepository.findByEmail(coachEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + coachEmail));
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
        User user = userRepository.findByEmail(principalEmail).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + principalEmail));

        if (dto.getName() != null && !dto.getName().isBlank())
            user.setName(dto.getName().trim());
        if (dto.getLastName() != null) {
            String ln = dto.getLastName().trim();
            if (ln.isEmpty() || ln.equalsIgnoreCase(user.getUsername()))
                user.setLastName(null);
            else
                user.setLastName(ln);
        }
        if (dto.getBirthDate() != null)
            user.setBirthDate(dto.getBirthDate());
        if (dto.getEmail() != null && !dto.getEmail().isBlank() && !dto.getEmail().equalsIgnoreCase(user.getEmail())) {
            String newEmail = dto.getEmail().trim();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email en uso.");
            });
            user.setEmail(newEmail);
        }
        if (dto.getRoutineJson() != null)
            user.setRoutineJson(dto.getRoutineJson());

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
            if (body.get("weight") != null)
                log.setWeight(readDouble(body.get("weight")));
            if (body.get("waist") != null)
                log.setWaist(readDouble(body.get("waist")));
            if (body.get("hip") != null)
                log.setHip(readDouble(body.get("hip")));
            if (body.get("neck") != null)
                log.setNeck(readDouble(body.get("neck")));
            if (body.get("biceps") != null)
                log.setBiceps(readDouble(body.get("biceps")));
            if (body.get("leg") != null)
                log.setLeg(readDouble(body.get("leg")));
            if (body.get("chest") != null)
                log.setChest(readDouble(body.get("chest")));
            if (body.get("calf") != null)
                log.setCalf(readDouble(body.get("calf")));
            if (body.get("forearm") != null)
                log.setForearm(readDouble(body.get("forearm")));
            if (body.get("back") != null)
                log.setBack(readDouble(body.get("back")));
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

    // --- PR Updates ---
    @Transactional
    public void updatePersonalRecords(String principal, Map<String, Double> newRecords) {
        if (newRecords == null || newRecords.isEmpty()) return;
        User user = getUserByPrincipal(principal);
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Double> currentRecords = new java.util.HashMap<>();
            if (user.getPersonalRecordsJson() != null && !user.getPersonalRecordsJson().isBlank()) {
                currentRecords = mapper.readValue(user.getPersonalRecordsJson(), new TypeReference<Map<String, Double>>() {});
            }
            
            boolean updated = false;
            for (Map.Entry<String, Double> entry : newRecords.entrySet()) {
                String exName = entry.getKey();
                Double newWeight = entry.getValue();
                if (exName == null || exName.isBlank() || newWeight == null || newWeight <= 0) continue;
                
                String cleanName = cleanExerciseNamePR(exName);
                if (cleanName.isBlank()) continue;
                
                Double currentMax = currentRecords.get(cleanName);
                if (currentMax == null || newWeight > currentMax) {
                    currentRecords.put(cleanName, newWeight);
                    updated = true;
                }
            }
            
            if (updated) {
                user.setPersonalRecordsJson(mapper.writeValueAsString(currentRecords));
                userRepository.save(user);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String cleanExerciseNamePR(String text) {
        if (text == null) return "";
        return text.toLowerCase().replaceAll("[^a-záéíóúüñ0-9]", "").trim();
    }

    // --- Private Helper Methods ---

    private String generateUniqueUsername(String firstName, String surnames) {
        String cleanFirst = normalizeAndClean(firstName);
        if (cleanFirst.isEmpty()) {
            cleanFirst = "u";
        }
        char firstLetter = cleanFirst.charAt(0);

        String cleanSurnames = normalizeAndClean(surnames);
        String[] surnameParts = cleanSurnames.split("\\s+");

        StringBuilder surnameBuilder = new StringBuilder();
        if (surnameParts.length > 0) {
            String firstSurname = surnameParts[0];
            surnameBuilder.append(firstSurname);
            if (firstSurname.length() < 5 && surnameParts.length > 1) {
                String secondSurname = surnameParts[1];
                surnameBuilder.append(secondSurname);
            }
        }

        String combinedSurnames = surnameBuilder.toString();
        int takeLength = Math.min(combinedSurnames.length(), 5);
        String surnamePart = combinedSurnames.substring(0, takeLength);

        String baseUsername = firstLetter + surnamePart;

        String username = baseUsername;
        int num = 1;
        while (userRepository.existsByUsernameIgnoreCase(username)
                || userRepository.findByEmailIgnoreCase(username).isPresent()) {
            username = baseUsername + num;
            num++;
        }
        return username;
    }

    private String normalizeAndClean(String text) {
        if (text == null)
            return "";
        String normalized = java.text.Normalizer.normalize(text.toLowerCase(), java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("[^a-z\\s]", "").replaceAll("\\s+", " ").trim();
    }

    private String generateTempPassword() {
        String alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++)
            sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return sb.toString();
    }

    private Double readDouble(Object value) {
        if (value == null)
            return null;
        if (value instanceof Number n)
            return n.doubleValue();
        try {
            return Double.parseDouble(value.toString().trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}