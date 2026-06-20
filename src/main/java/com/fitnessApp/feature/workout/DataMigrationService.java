package com.fitnessApp.feature.workout;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;

@Service
@lombok.RequiredArgsConstructor
public class DataMigrationService implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final WorkoutSessionRepository workoutSessionRepository;
    private final RoutineJsonService routineJsonService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        migrateUsers();
        migrateWorkoutSessions();
        migrateRoutineTemplates();
    }

    private void migrateUsers() {
        try {
            // Comprobamos si la columna existe antes de migrar
            jdbcTemplate.queryForList("SELECT id, routine_json, next_routine_json FROM users LIMIT 1");
        } catch (Exception e) {
            return; // Column no existe o la tabla no estǭ lista
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id, routine_json, next_routine_json FROM users");
        for (Map<String, Object> row : rows) {
            UUID id = (UUID) row.get("id");
            String rJson = (String) row.get("routine_json");
            String nrJson = (String) row.get("next_routine_json");

            User u = userRepository.findById(id).orElse(null);
            if (u == null) continue;

            boolean updated = false;
            if (rJson != null && !rJson.isBlank() && u.getRoutine() == null) {
                u.setRoutine(routineJsonService.fromJson(rJson, null));
                updated = true;
            }
            if (nrJson != null && !nrJson.isBlank() && u.getNextRoutine() == null) {
                u.setNextRoutine(routineJsonService.fromJson(nrJson, null));
                updated = true;
            }

            if (updated) {
                userRepository.save(u);
            }
        }
    }

    private void migrateWorkoutSessions() {
        try {
            jdbcTemplate.queryForList("SELECT id, logs_json, comments_json, video_links_json, day_name FROM workout_sessions LIMIT 1");
        } catch (Exception e) {
            return;
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id, logs_json, comments_json, video_links_json, day_name FROM workout_sessions");
        for (Map<String, Object> row : rows) {
            UUID id = (UUID) row.get("id");
            String lJson = (String) row.get("logs_json");
            String cJson = (String) row.get("comments_json");
            String vJson = (String) row.get("video_links_json");
            String dayName = (String) row.get("day_name");

            WorkoutSession session = workoutSessionRepository.findById(id).orElse(null);
            if (session == null) continue;

            boolean updated = false;

            if (cJson != null && !cJson.isBlank() && session.getClientComments() == null) {
                try {
                    Map<String, String> map = mapper.readValue(cJson, new TypeReference<Map<String, String>>() {});
                    session.setClientComments(map.get(dayName));
                    updated = true;
                } catch (Exception ignored) {}
            }

            if (vJson != null && !vJson.isBlank() && session.getVideoLink() == null) {
                try {
                    Map<String, String> map = mapper.readValue(vJson, new TypeReference<Map<String, String>>() {});
                    session.setVideoLink(map.get(dayName));
                    updated = true;
                } catch (Exception ignored) {}
            }

            if (lJson != null && !lJson.isBlank() && session.getSets().isEmpty()) {
                try {
                    // Try the outer Map -> Map format
                    Map<String, List<Map<String, Object>>> logsMap = null;
                    try {
                        Map<String, Map<String, List<Map<String, Object>>>> outerMap = mapper.readValue(lJson,
                                new TypeReference<Map<String, Map<String, List<Map<String, Object>>>>>() {});
                        logsMap = outerMap.get(dayName);
                        if (logsMap == null && outerMap.keySet().stream().anyMatch(k -> k.matches("\\d+"))) {
                            logsMap = mapper.readValue(lJson, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
                        }
                    } catch (Exception e) {
                        // Try fallback
                        logsMap = mapper.readValue(lJson, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
                    }

                    if (logsMap != null) {
                        for (Map.Entry<String, List<Map<String, Object>>> entry : logsMap.entrySet()) {
                            int exIdx = 0;
                            try { exIdx = Integer.parseInt(entry.getKey()); } catch (Exception ex) { continue; }
                            
                            List<Map<String, Object>> exLogs = entry.getValue();
                            for (int i = 0; i < exLogs.size(); i++) {
                                Map<String, Object> setMap = exLogs.get(i);
                                if (setMap == null) continue;
                                
                                SetLog setLog = new SetLog();
                                setLog.setExerciseIndex(exIdx);
                                setLog.setSetIndex(i);
                                if (setMap.get("exerciseName") != null) setLog.setExerciseName(String.valueOf(setMap.get("exerciseName")));
                                if (setMap.get("weight") != null) setLog.setWeight(String.valueOf(setMap.get("weight")));
                                if (setMap.get("reps") != null) setLog.setReps(String.valueOf(setMap.get("reps")));
                                if (setMap.get("completed") != null) setLog.setCompleted(Boolean.parseBoolean(String.valueOf(setMap.get("completed"))));
                                if (setMap.get("skipped") != null) setLog.setSkipped(Boolean.parseBoolean(String.valueOf(setMap.get("skipped"))));
                                if (setMap.get("intensity") != null) setLog.setIntensity(String.valueOf(setMap.get("intensity")));
                                if (setMap.get("notes") != null) setLog.setNotes(String.valueOf(setMap.get("notes")));
                                
                                session.addSetLog(setLog);
                            }
                        }
                        updated = true;
                    }
                } catch (Exception ignored) {}
            }

            if (updated) {
                workoutSessionRepository.save(session);
            }
        }
    }

    private void migrateRoutineTemplates() {
        // We omit routine templates migration here for simplicity as we want to avoid Circular Dependencies
        // but can be implemented similarly if needed.
    }
}
