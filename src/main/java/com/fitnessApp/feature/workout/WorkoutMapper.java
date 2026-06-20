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
        ObjectMapper mapper = new ObjectMapper();
        
        // logsJson
        if (entity.getSets() != null && !entity.getSets().isEmpty()) {
            try {
                Map<String, List<Map<String, Object>>> dayLogs = new HashMap<>();
                for (SetLog setLog : entity.getSets()) {
                    String exIdx = String.valueOf(setLog.getExerciseIndex());
                    dayLogs.putIfAbsent(exIdx, new ArrayList<>());
                    
                    Map<String, Object> map = new HashMap<>();
                    map.put("completed", setLog.isCompleted());
                    map.put("skipped", setLog.isSkipped());
                    map.put("weight", setLog.getWeight() != null ? setLog.getWeight() : "");
                    map.put("reps", setLog.getReps() != null ? setLog.getReps() : "");
                    map.put("intensity", setLog.getIntensity() != null ? setLog.getIntensity() : "");
                    map.put("notes", setLog.getNotes() != null ? setLog.getNotes() : "");
                    map.put("exerciseName", setLog.getExerciseName());
                    
                    List<Map<String, Object>> exLogs = dayLogs.get(exIdx);
                    while (exLogs.size() <= setLog.getSetIndex()) {
                        exLogs.add(null);
                    }
                    exLogs.set(setLog.getSetIndex(), map);
                }
                
                for (List<Map<String, Object>> exLogs : dayLogs.values()) {
                    exLogs.removeIf(m -> m == null);
                }

                Map<String, Object> outerMap = new HashMap<>();
                outerMap.put(entity.getDayName(), dayLogs);
                
                dto.setLogsJson(mapper.writeValueAsString(outerMap));
            } catch (Exception e) {
                dto.setLogsJson("{}");
            }
        } else {
            dto.setLogsJson("{}");
        }
        
        // commentsJson
        if (entity.getClientComments() != null && !entity.getClientComments().isBlank()) {
            try {
                Map<String, String> commentsMap = new HashMap<>();
                commentsMap.put(entity.getDayName(), entity.getClientComments());
                dto.setCommentsJson(mapper.writeValueAsString(commentsMap));
            } catch (Exception e) {
                dto.setCommentsJson("{}");
            }
        } else {
            dto.setCommentsJson("{}");
        }
        
        // videoLinksJson
        if (entity.getVideoLink() != null && !entity.getVideoLink().isBlank()) {
            try {
                Map<String, String> linksMap = new HashMap<>();
                linksMap.put(entity.getDayName(), entity.getVideoLink());
                dto.setVideoLinksJson(mapper.writeValueAsString(linksMap));
            } catch (Exception e) {
                dto.setVideoLinksJson("{}");
            }
        } else {
            dto.setVideoLinksJson("{}");
        }
    }
}
