package com.fitnessApp.feature.workout;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(DataMigrationService.class);

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final WorkoutSessionRepository workoutSessionRepository;
    private final RoutineJsonService routineJsonService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public void run(String... args) {
        fixConstraints();
        try {
            migrateUsers();
        } catch (Exception e) {
            log.warn("Migration of users skipped: {}", e.getMessage());
        }
        try {
            migrateWorkoutSessions();
        } catch (Exception e) {
            log.warn("Migration of workout sessions skipped: {}", e.getMessage());
        }
    }

    /**
     * Hibernate ddl-auto:update does NOT alter existing columns to drop NOT NULL.
     * We do it manually here so the schema matches the entity annotations.
     */
    private void fixConstraints() {
        String[] statements = {
            "ALTER TABLE routines ALTER COLUMN title DROP NOT NULL",
            "ALTER TABLE routines ALTER COLUMN coach_id DROP NOT NULL",
        };
        for (String sql : statements) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception e) {
                // Column might not exist yet or constraint already dropped — ignore
            }
        }
    }

    @Transactional
    protected void migrateUsers() {
        // Check if legacy columns still exist
        if (!columnExists("users", "routine_json")) {
            log.info("Column routine_json not found in users table, skipping user migration.");
            return;
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, routine_json, next_routine_json FROM users WHERE routine_json IS NOT NULL AND routine_json <> ''");
        
        int migrated = 0;
        for (Map<String, Object> row : rows) {
            try {
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
                    migrated++;
                }
            } catch (Exception e) {
                log.warn("Error migrating user {}: {}", row.get("id"), e.getMessage());
            }
        }
        log.info("Migrated {} users from JSON to relational routines.", migrated);
    }

    @Transactional
    protected void migrateWorkoutSessions() {
        if (!columnExists("workout_sessions", "logs_json")) {
            log.info("Column logs_json not found in workout_sessions table, skipping session migration.");
            return;
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, logs_json, comments_json, video_links_json, day_name FROM workout_sessions WHERE logs_json IS NOT NULL AND logs_json <> ''");

        int migrated = 0;
        for (Map<String, Object> row : rows) {
            try {
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
                        Map<String, List<Map<String, Object>>> logsMap = null;
                        try {
                            Map<String, Map<String, List<Map<String, Object>>>> outerMap = mapper.readValue(lJson,
                                    new TypeReference<Map<String, Map<String, List<Map<String, Object>>>>>() {});
                            logsMap = outerMap.get(dayName);
                            if (logsMap == null && outerMap.keySet().stream().anyMatch(k -> k.matches("\\d+"))) {
                                logsMap = mapper.readValue(lJson, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
                            }
                        } catch (Exception e) {
                            logsMap = mapper.readValue(lJson, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
                        }

                        if (logsMap != null) {
                            for (Map.Entry<String, List<Map<String, Object>>> entry : logsMap.entrySet()) {
                                int exIdx;
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
                    migrated++;
                }
            } catch (Exception e) {
                log.warn("Error migrating workout session {}: {}", row.get("id"), e.getMessage());
            }
        }
        log.info("Migrated {} workout sessions from JSON to relational set logs.", migrated);
    }

    private boolean columnExists(String tableName, String columnName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
                    Integer.class, tableName, columnName);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
