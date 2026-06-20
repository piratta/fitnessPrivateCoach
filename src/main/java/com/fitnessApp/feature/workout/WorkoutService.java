package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import com.fitnessApp.core.exception.ClientNotFoundException;
import com.fitnessApp.core.exception.WorkoutNotFoundException;

@Service // ¡Esta anotación es la clave!
@RequiredArgsConstructor
@SuppressWarnings("null")
public class WorkoutService {

    private final WorkoutSessionRepository workoutRepository;
    private final UserRepository userRepository;
    private final WorkoutMapper workoutMapper;
    private final SetLogRepository setLogRepository;

    public UUID startWorkoutSession(String principalEmail, StartWorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail)
                .or(() -> userRepository.findByUsername(principalEmail))
                .orElseThrow();

        List<WorkoutStatus> activeStatuses = List.of(WorkoutStatus.IN_PROGRESS, WorkoutStatus.PAUSED);
        WorkoutSession session = workoutRepository
                .findFirstByClientIdAndStatusInOrderBySessionDateDesc(client.getId(), activeStatuses)
                .orElseGet(WorkoutSession::new);

        if (session.getId() == null) {
            session.setClient(client);
            session.setDayName(request.getDayName());
            session.setSessionDate(LocalDate.now());
            session.setAssignedDate(LocalDate.now());
            session.setStatus(WorkoutStatus.IN_PROGRESS);
            
            String snapshot = request.getRoutineSnapshotJson();
            if (snapshot == null || snapshot.isBlank()) {
                snapshot = client.getRoutineJson();
            }
            session.setRoutineSnapshotJson(snapshot);
            session = workoutRepository.save(session);
        }
        return session.getId();
    }

    public void syncSetLog(UUID sessionId, SetLogDto request) {
        WorkoutSession session = workoutRepository.findById(sessionId)
                .orElseThrow(() -> new WorkoutNotFoundException("Session not found: " + sessionId));

        SetLog setLog = setLogRepository.findByWorkoutSessionIdAndExerciseIndexAndSetIndex(
                sessionId, request.getExerciseIndex(), request.getSetIndex()
        ).orElseGet(SetLog::new);

        setLog.setWorkoutSession(session);
        setLog.setExerciseIndex(request.getExerciseIndex());
        setLog.setSetIndex(request.getSetIndex());
        setLog.setExerciseName(request.getExerciseName());
        setLog.setWeightLifted(request.getWeightLifted());
        setLog.setRepsDone(request.getRepsDone());
        setLog.setRir(request.getRir());
        setLog.setRpe(request.getRpe());
        setLog.setTempo(request.getTempo());
        setLog.setCompleted(request.isCompleted());

        setLogRepository.save(setLog);
    }

    public WorkoutDto getActiveSession(String principalEmail) {
        User client = userRepository.findByEmail(principalEmail)
                .or(() -> userRepository.findByUsername(principalEmail))
                .orElseThrow();

        List<WorkoutStatus> activeStatuses = List.of(WorkoutStatus.IN_PROGRESS, WorkoutStatus.PAUSED);
        WorkoutSession session = workoutRepository
                .findFirstByClientIdAndStatusInOrderBySessionDateDesc(client.getId(), activeStatuses)
                .orElse(null);

        if (session == null) return null;
        return workoutMapper.toDto(session);
    }

    public UUID finishWorkout(String principalEmail, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail)
                .or(() -> userRepository.findByUsername(principalEmail))
                .orElseThrow();

        List<WorkoutStatus> activeStatuses = List.of(WorkoutStatus.IN_PROGRESS, WorkoutStatus.PAUSED);
        WorkoutSession session = workoutRepository
                .findFirstByClientIdAndStatusInOrderBySessionDateDesc(client.getId(), activeStatuses)
                .orElseGet(() -> workoutRepository
                    .findFirstByClientAndDayNameAndSessionDate(client, request.getDayName(), LocalDate.now())
                    .orElseGet(WorkoutSession::new));

        session.setClient(client);
        session.setDayName(request.getDayName());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());
        if (session.getSessionDate() == null) session.setSessionDate(LocalDate.now());
        if (session.getAssignedDate() == null) session.setAssignedDate(request.getAssignedDate() != null ? request.getAssignedDate() : LocalDate.now());

        session.setStatus(WorkoutStatus.COMPLETED);

        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());

        String snapshot = request.getRoutineSnapshotJson();
        if (snapshot == null || snapshot.isBlank()) {
            snapshot = client.getRoutineJson();
        }
        session.setRoutineSnapshotJson(snapshot);

        session.setStress(request.getStress());
        session.setFatigue(request.getFatigue());
        session.setMotivation(request.getMotivation());
        session.setSleepHours(request.getSleepHours());
        session.setDigestions(request.getDigestions());

        return workoutRepository.save(session).getId();
    }

    public void updateWorkout(String principalEmail, UUID id, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail)
                .orElseThrow(() -> new ClientNotFoundException("Cliente no encontrado con email: " + principalEmail));
        WorkoutSession session = workoutRepository.findById(id)
                .orElseThrow(() -> new WorkoutNotFoundException("Sesión de entrenamiento no encontrada con ID: " + id));

        if (!session.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("No tienes permisos para modificar este entrenamiento.");
        }

        if (request.getDayName() != null && !request.getDayName().isBlank()) {
            session.setDayName(request.getDayName());
        }
        
        if (request.getSessionDate() != null) {
            session.setSessionDate(request.getSessionDate());
        }

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

        parseAndSaveSetLogs(request.getLogsJson(), session);

        workoutRepository.save(session);
    }

    private void parseAndSaveSetLogs(String logsJson, WorkoutSession session) {
        if (logsJson == null || logsJson.isBlank())
            return;

        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, List<Map<String, Object>>> logsMap = mapper.readValue(logsJson,
                    new TypeReference<Map<String, List<Map<String, Object>>>>() {
                    });

            if (session.getSets() == null) {
                session.setSets(new java.util.ArrayList<>());
            } else {
                session.getSets().clear();
            }

            for (Map.Entry<String, List<Map<String, Object>>> entry : logsMap.entrySet()) {
                int exerciseIndex = 0;
                try {
                    exerciseIndex = Integer.parseInt(entry.getKey());
                } catch (NumberFormatException e) {
                    continue;
                }

                List<Map<String, Object>> exLogs = entry.getValue();
                if (exLogs == null)
                    continue;

                for (int setIndex = 0; setIndex < exLogs.size(); setIndex++) {
                    Map<String, Object> setMap = exLogs.get(setIndex);
                    if (setMap == null)
                        continue;

                    SetLog setLog = new SetLog();
                    setLog.setExerciseIndex(exerciseIndex);
                    setLog.setSetIndex(setIndex);

                    if (setMap.get("exerciseName") != null) {
                        setLog.setExerciseName(String.valueOf(setMap.get("exerciseName")));
                    }

                    if (setMap.get("completed") != null) {
                        setLog.setCompleted(Boolean.parseBoolean(String.valueOf(setMap.get("completed"))));
                    }

                    if (setMap.get("weight") != null && !String.valueOf(setMap.get("weight")).isBlank()) {
                        try {
                            setLog.setWeightLifted(Double.parseDouble(String.valueOf(setMap.get("weight"))));
                        } catch (NumberFormatException ignored) {
                        }
                    }

                    if (setMap.get("reps") != null) {
                        setLog.setRepsDone(String.valueOf(setMap.get("reps")));
                    }

                    if (setMap.get("rir") != null && !String.valueOf(setMap.get("rir")).isBlank()) {
                        try {
                            setLog.setRir(Integer.parseInt(String.valueOf(setMap.get("rir"))));
                        } catch (NumberFormatException ignored) {
                        }
                    }

                    if (setMap.get("rpe") != null && !String.valueOf(setMap.get("rpe")).isBlank()) {
                        try {
                            setLog.setRpe(Double.parseDouble(String.valueOf(setMap.get("rpe"))));
                        } catch (NumberFormatException ignored) {
                        }
                    }

                    if (setMap.get("tempo") != null) {
                        setLog.setTempo(String.valueOf(setMap.get("tempo")));
                    }

                    session.addSetLog(setLog);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<WorkoutDto> getHistory(UUID clientId) {
        List<WorkoutSession> sessions = workoutRepository.findByClientIdOrderBySessionDateDesc(clientId);
        return sessions.stream().map(workoutMapper::toDto).collect(Collectors.toList());
    }

    public List<WorkoutDto> getHistoryByEmail(String email) {
        User client = userRepository.findByEmail(email).orElse(null);
        if (client == null)
            return null;
        return getHistory(client.getId());
    }

    private String cleanExerciseName(Object nameObj) {
        if (nameObj == null)
            return "";
        return nameObj.toString().toLowerCase()
                .replaceAll("[^a-záéíóúüñ0-9]", "")
                .trim();
    }

    @SuppressWarnings("unchecked")
    public String enrichRoutineWithSuggestedWeights(User client, String routineJson) {
        if (routineJson == null || routineJson.isBlank())
            return routineJson;
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> rawRoutine = mapper.readValue(routineJson, new TypeReference<Map<String, Object>>() {
            });
            List<WorkoutSession> history = workoutRepository.findByClientIdOrderBySessionDateDesc(client.getId());

            for (Map.Entry<String, Object> entry : rawRoutine.entrySet()) {
                String dayName = entry.getKey();
                if (dayName.endsWith("_notes")) {
                    continue;
                }
                Object val = entry.getValue();
                if (!(val instanceof List)) {
                    continue;
                }
                List<Map<String, Object>> exercises = (List<Map<String, Object>>) val;

                for (int i = 0; i < exercises.size(); i++) {
                    Map<String, Object> exercise = exercises.get(i);
                    String exName = exercise.get("name") == null ? "" : exercise.get("name").toString();

                    String lastWeight = null;
                    
                    if (!exName.isEmpty()) {
                        java.util.Optional<SetLog> lastSetOpt = setLogRepository.findFirstByWorkoutSessionClientIdAndExerciseNameAndIsCompletedTrueAndWeightLiftedGreaterThanOrderByWorkoutSessionSessionDateDesc(client.getId(), exName, 0.0);
                        if (lastSetOpt.isPresent()) {
                            lastWeight = String.valueOf(lastSetOpt.get().getWeightLifted());
                        }
                    }
                    
                    if (lastWeight != null) {
                        try {
                            double w = Double.parseDouble(lastWeight);
                            if (w == Math.floor(w)) {
                                exercise.put("expectedWeight", String.valueOf((int) w));
                            } else {
                                exercise.put("expectedWeight", String.valueOf(w));
                            }
                        } catch (NumberFormatException e) {
                            exercise.put("expectedWeight", lastWeight);
                        }
                    }
                }
            }

            return mapper.writeValueAsString(rawRoutine);
        } catch (Exception e) {
            e.printStackTrace();
            return routineJson; // Return original on error
        }
    }
}