package com.fitnessApp.fitnessapp.feature.workout;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutDto {
    private UUID id;
    private String dayName;
    private int durationSeconds;
    private double totalVolume;
    private int completedSets;
    private int completionPercentage;
    private LocalDate sessionDate;
    private String logsJson;
    private String commentsJson;
    private String videoLinksJson;
}