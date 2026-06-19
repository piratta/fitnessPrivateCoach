package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {
    
    @EntityGraph(attributePaths = {"sets", "sets.routineExercise"})
    List<WorkoutSession> findByClientIdOrderBySessionDateDesc(UUID clientId);

    // Used by the finish-workout endpoint to UPSERT instead of creating a duplicate row when
    // the client finalises the same day's routine multiple times in the same calendar day.
    @EntityGraph(attributePaths = {"sets", "sets.routineExercise"})
    Optional<WorkoutSession> findFirstByClientAndDayNameAndSessionDate(User client, String dayName, LocalDate sessionDate);
}
