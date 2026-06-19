package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service // ¡Esta anotación es la clave!
public class WorkoutService {

    @Autowired
    private WorkoutSessionRepository workoutRepository;

    @Autowired
    private UserRepository userRepository;

    public UUID finishWorkout(String principalEmail, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail)
                .or(() -> userRepository.findByUsername(principalEmail))
                .orElseThrow();

        LocalDate today = LocalDate.now();
        WorkoutSession session = workoutRepository
                .findFirstByClientAndDayNameAndSessionDate(client, request.getDayName(), today)
                .orElseGet(WorkoutSession::new);

        session.setClient(client);
        session.setDayName(request.getDayName());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());
        session.setSessionDate(today);
        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());
        session.setStress(request.getStress());
        session.setFatigue(request.getFatigue());
        session.setMotivation(request.getMotivation());
        session.setSleepHours(request.getSleepHours());
        session.setDigestions(request.getDigestions());

        return workoutRepository.save(session).getId();
    }

    public void updateWorkout(String principalEmail, UUID id, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail).orElseThrow();
        WorkoutSession session = workoutRepository.findById(id).orElseThrow();

        if (!session.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("No tienes permisos para modificar este entrenamiento.");
        }

        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());
        session.setStress(request.getStress());
        session.setFatigue(request.getFatigue());
        session.setMotivation(request.getMotivation());
        session.setSleepHours(request.getSleepHours());
        session.setDigestions(request.getDigestions());

        workoutRepository.save(session);
    }

    public List<WorkoutDto> getHistory(UUID clientId) {
        List<WorkoutSession> sessions = workoutRepository.findByClientIdOrderBySessionDateDesc(clientId);
        return sessions.stream().map(s -> {
            WorkoutDto dto = new WorkoutDto();
            dto.setId(s.getId());
            dto.setDayName(s.getDayName());
            dto.setDurationSeconds(s.getDurationSeconds());
            dto.setTotalVolume(s.getTotalVolume());
            dto.setCompletedSets(s.getCompletedSets());
            dto.setCompletionPercentage(s.getCompletionPercentage());
            dto.setSessionDate(s.getSessionDate());
            dto.setLogsJson(s.getLogsJson());
            dto.setCommentsJson(s.getCommentsJson());
            dto.setVideoLinksJson(s.getVideoLinksJson());
            dto.setStress(s.getStress());
            dto.setFatigue(s.getFatigue());
            dto.setMotivation(s.getMotivation());
            dto.setSleepHours(s.getSleepHours());
            dto.setDigestions(s.getDigestions());
            return dto;
        }).collect(Collectors.toList());
    }

    public List<WorkoutDto> getHistoryByEmail(String email) {
        User client = userRepository.findByEmail(email).orElse(null);
        if (client == null) return null;
        return getHistory(client.getId());
    }

    private String cleanExerciseName(Object nameObj) {
        if (nameObj == null) return "";
        return nameObj.toString().toLowerCase()
                .replaceAll("[^a-záéíóúüñ0-9]", "")
                .trim();
    }

    public String enrichRoutineWithSuggestedWeights(User client, String routineJson) {
        if (routineJson == null || routineJson.isBlank()) return routineJson;
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, List<Map<String, Object>>> routine = mapper.readValue(routineJson, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
            List<WorkoutSession> history = workoutRepository.findByClientIdOrderBySessionDateDesc(client.getId());

            for (Map.Entry<String, List<Map<String, Object>>> entry : routine.entrySet()) {
                String dayName = entry.getKey();
                List<Map<String, Object>> exercises = entry.getValue();

                for (int i = 0; i < exercises.size(); i++) {
                    Map<String, Object> exercise = exercises.get(i);
                    String exName = exercise.get("name") == null ? "" : exercise.get("name").toString();
                    String targetClean = cleanExerciseName(exName);
                    
                    String lastWeight = null;
                    boolean foundByName = false;

                    // 1. Try to find the most recent set log in history matching the exercise name
                    if (!targetClean.isEmpty()) {
                        for (WorkoutSession s : history) {
                            if (s.getLogsJson() == null || s.getLogsJson().isBlank()) continue;
                            try {
                                Map<String, Object> logs = mapper.readValue(s.getLogsJson(), new TypeReference<Map<String, Object>>() {});
                                for (Object logVal : logs.values()) {
                                    if (logVal instanceof List<?> exLogs) {
                                        boolean matchesName = false;
                                        String tempLastWeight = null;
                                        
                                        for (Object setLogObj : exLogs) {
                                            if (setLogObj instanceof Map<?, ?> setLog) {
                                                Object nameVal = setLog.get("exerciseName");
                                                if (nameVal != null && cleanExerciseName(nameVal).equals(targetClean)) {
                                                    matchesName = true;
                                                }
                                                if (Boolean.TRUE.equals(setLog.get("completed")) && setLog.get("weight") != null) {
                                                    String w = String.valueOf(setLog.get("weight"));
                                                    if (!w.isBlank() && !w.equals("null")) {
                                                        tempLastWeight = w;
                                                    }
                                                }
                                            }
                                        }
                                        
                                        if (matchesName && tempLastWeight != null) {
                                            lastWeight = tempLastWeight;
                                            foundByName = true;
                                            break;
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                            if (foundByName) break;
                        }
                    }

                    // 2. Fallback to index-based matching in the last session for the same day name (legacy)
                    if (lastWeight == null) {
                        WorkoutSession lastSession = history.stream()
                                .filter(s -> dayName.equals(s.getDayName()) && s.getLogsJson() != null && !s.getLogsJson().isBlank())
                                .findFirst().orElse(null);

                        if (lastSession != null) {
                            try {
                                Map<String, Object> logs = mapper.readValue(lastSession.getLogsJson(), new TypeReference<Map<String, Object>>() {});
                                Object exLogsObj = logs.get(String.valueOf(i));
                                if (exLogsObj instanceof List<?> exLogs) {
                                    for (Object setLogObj : exLogs) {
                                        if (setLogObj instanceof Map<?, ?> setLog) {
                                            if (Boolean.TRUE.equals(setLog.get("completed")) && setLog.get("weight") != null) {
                                                String w = String.valueOf(setLog.get("weight"));
                                                if (!w.isBlank() && !w.equals("null")) {
                                                    lastWeight = w;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                    }

                    if (lastWeight != null) {
                        exercise.put("suggestedWeight", lastWeight);
                    }
                }
            }
            return mapper.writeValueAsString(routine);
        } catch (Exception e) {
            e.printStackTrace();
            return routineJson; // Return original on error
        }
    }
}