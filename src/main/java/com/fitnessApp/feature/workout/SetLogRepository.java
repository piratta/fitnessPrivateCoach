package com.fitnessApp.feature.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {
    
    @Query("SELECT s FROM SetLog s WHERE s.workoutSession.client.id = :clientId AND s.completed = true AND s.weight IS NOT NULL AND s.weight <> '' AND s.weight <> '0' ORDER BY s.workoutSession.sessionDate DESC")
    List<SetLog> findValidSetsForClient(@Param("clientId") UUID clientId);
    
    java.util.Optional<SetLog> findByWorkoutSessionIdAndExerciseIndexAndSetIndex(UUID sessionId, int exerciseIndex, int setIndex);

    @Query("SELECT s FROM SetLog s WHERE s.workoutSession.client.id = :clientId AND s.exerciseName = :exerciseName AND s.completed = true AND s.weight IS NOT NULL AND s.weight <> '' AND s.weight <> '0' ORDER BY s.workoutSession.sessionDate DESC")
    List<SetLog> findLastValidSetForExerciseList(@Param("clientId") UUID clientId, @Param("exerciseName") String exerciseName, Pageable pageable);

    default java.util.Optional<SetLog> findLastValidSetForExercise(UUID clientId, String exerciseName) {
        List<SetLog> list = findLastValidSetForExerciseList(clientId, exerciseName, org.springframework.data.domain.PageRequest.of(0, 1));
        return list.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(list.get(0));
    }
}
