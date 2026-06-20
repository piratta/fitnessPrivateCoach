package com.fitnessApp.feature.workout;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RoutineJsonService {

    private final ObjectMapper mapper = new ObjectMapper();

    @SuppressWarnings("unchecked")
    public String toJson(Routine routine) {
        if (routine == null || routine.getDays().isEmpty()) {
            return "{}";
        }
        try {
            Map<String, Object> map = new LinkedHashMap<>();
            for (RoutineDay day : routine.getDays()) {
                if (day.getCoachNotes() != null && !day.getCoachNotes().isBlank()) {
                    map.put(day.getDayName() + "_notes", day.getCoachNotes());
                }
                List<Map<String, Object>> exercises = new ArrayList<>();
                for (RoutineExercise ex : day.getExercises()) {
                    Map<String, Object> exMap = new LinkedHashMap<>();
                    exMap.put("name", ex.getName());
                    exMap.put("isOptional", ex.isOptional());
                    
                    List<Map<String, Object>> sets = new ArrayList<>();
                    for (RoutineExerciseSet s : ex.getSets()) {
                        Map<String, Object> sMap = new LinkedHashMap<>();
                        sMap.put("reps", s.getReps());
                        sMap.put("intensity", s.getIntensity());
                        sMap.put("notes", s.getNotes());
                        sets.add(sMap);
                    }
                    exMap.put("sets", sets);
                    exercises.add(exMap);
                }
                map.put(day.getDayName(), exercises);
            }
            return mapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    public Routine fromJson(String json, Routine existingRoutine) {
        if (json == null || json.isBlank()) {
            if (existingRoutine != null) {
                existingRoutine.getDays().clear();
                return existingRoutine;
            }
            return new Routine();
        }

        try {
            Map<String, Object> rawRoutine = mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            Routine routine = existingRoutine != null ? existingRoutine : new Routine();
            routine.getDays().clear();

            for (Map.Entry<String, Object> entry : rawRoutine.entrySet()) {
                String dayName = entry.getKey();
                if (dayName.endsWith("_notes")) {
                    continue;
                }

                Object val = entry.getValue();
                if (!(val instanceof List)) {
                    continue;
                }

                RoutineDay day = new RoutineDay();
                day.setDayName(dayName);
                day.setRoutine(routine);

                Object notesObj = rawRoutine.get(dayName + "_notes");
                if (notesObj instanceof String) {
                    day.setCoachNotes((String) notesObj);
                }

                List<?> exercisesRaw = (List<?>) val;
                int exIndex = 0;
                for (Object exObj : exercisesRaw) {
                    if (!(exObj instanceof Map)) continue;
                    Map<String, Object> exMap = (Map<String, Object>) exObj;

                    RoutineExercise exercise = new RoutineExercise();
                    exercise.setRoutineDay(day);
                    exercise.setName(exMap.get("name") != null ? exMap.get("name").toString() : "");
                    exercise.setExerciseIndex(exIndex++);
                    
                    Object isOpt = exMap.get("isOptional");
                    exercise.setOptional(isOpt instanceof Boolean && (Boolean) isOpt);

                    Object setsObj = exMap.get("sets");
                    if (setsObj instanceof List) {
                        List<?> setsRaw = (List<?>) setsObj;
                        int setIndex = 0;
                        for (Object sObj : setsRaw) {
                            if (!(sObj instanceof Map)) continue;
                            Map<String, Object> sMap = (Map<String, Object>) sObj;
                            
                            RoutineExerciseSet set = new RoutineExerciseSet();
                            set.setRoutineExercise(exercise);
                            set.setSetIndex(setIndex++);
                            set.setReps(sMap.get("reps") != null ? sMap.get("reps").toString() : "");
                            set.setIntensity(sMap.get("intensity") != null ? sMap.get("intensity").toString() : "");
                            set.setNotes(sMap.get("notes") != null ? sMap.get("notes").toString() : "");
                            exercise.addSet(set);
                        }
                    }
                    day.addExercise(exercise);
                }
                routine.getDays().add(day);
            }
            return routine;
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return existingRoutine != null ? existingRoutine : new Routine();
        }
    }
}
