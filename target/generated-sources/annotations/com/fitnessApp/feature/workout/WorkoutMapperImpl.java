package com.fitnessApp.feature.workout;

import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-19T23:22:06+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 25.0.3 (Eclipse Adoptium)"
)
@Component
public class WorkoutMapperImpl implements WorkoutMapper {

    @Override
    public WorkoutDto toDto(WorkoutSession entity) {
        if ( entity == null ) {
            return null;
        }

        WorkoutDto.WorkoutDtoBuilder workoutDto = WorkoutDto.builder();

        workoutDto.id( entity.getId() );
        workoutDto.dayName( entity.getDayName() );
        workoutDto.durationSeconds( entity.getDurationSeconds() );
        workoutDto.totalVolume( entity.getTotalVolume() );
        workoutDto.completedSets( entity.getCompletedSets() );
        workoutDto.completionPercentage( entity.getCompletionPercentage() );
        workoutDto.sessionDate( entity.getSessionDate() );
        workoutDto.assignedDate( entity.getAssignedDate() );
        workoutDto.logsJson( entity.getLogsJson() );
        workoutDto.commentsJson( entity.getCommentsJson() );
        workoutDto.videoLinksJson( entity.getVideoLinksJson() );
        workoutDto.routineSnapshotJson( entity.getRoutineSnapshotJson() );
        workoutDto.stress( entity.getStress() );
        workoutDto.fatigue( entity.getFatigue() );
        workoutDto.motivation( entity.getMotivation() );
        workoutDto.sleepHours( entity.getSleepHours() );
        workoutDto.digestions( entity.getDigestions() );

        return workoutDto.build();
    }
}
