package com.fitnessApp.feature.workout;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public abstract class WorkoutMapper {

    public abstract WorkoutDto toDto(WorkoutSession entity);

    @AfterMapping
    protected void fillLogsJson(WorkoutSession entity, @MappingTarget WorkoutDto dto) {
        if (entity.getSets() != null && !entity.getSets().isEmpty()) {
            try {
                // Reconstruir logsJson agrupando por exerciseIndex
                Map<String, List<Map<String, Object>>> logsMap = new HashMap<>();
                for (SetLog setLog : entity.getSets()) {
                    String exIdx = String.valueOf(setLog.getExerciseIndex());
                    logsMap.putIfAbsent(exIdx, new ArrayList<>());
                    
                    Map<String, Object> map = new HashMap<>();
                    map.put("completed", setLog.isCompleted());
                    map.put("weight", setLog.getWeightLifted());
                    map.put("reps", setLog.getRepsDone());
                    map.put("rir", setLog.getRir());
                    map.put("rpe", setLog.getRpe());
                    map.put("tempo", setLog.getTempo());
                    map.put("exerciseName", setLog.getExerciseName());
                    map.put("setIndex", setLog.getSetIndex());
                    
                    // Add back to the list in order
                    List<Map<String, Object>> exLogs = logsMap.get(exIdx);
                    // Ensure the list is big enough to accommodate the setIndex
                    while (exLogs.size() <= setLog.getSetIndex()) {
                        exLogs.add(null);
                    }
                    exLogs.set(setLog.getSetIndex(), map);
                }
                
                // Clean up any nulls
                for (List<Map<String, Object>> exLogs : logsMap.values()) {
                    exLogs.removeIf(m -> m == null);
                }

                ObjectMapper mapper = new ObjectMapper();
                dto.setLogsJson(mapper.writeValueAsString(logsMap));
            } catch (Exception e) {
                // Fallback to legacy
                if (dto.getLogsJson() == null) {
                    dto.setLogsJson(entity.getLogsJson());
                }
            }
        } else {
            // Legacy workouts
            dto.setLogsJson(entity.getLogsJson());
        }
    }
}

