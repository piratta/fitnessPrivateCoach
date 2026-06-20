package com.fitnessApp.feature.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

import java.util.List;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {
    
    List<SetLog> findByWorkoutSessionClientIdAndIsCompletedTrueAndWeightLiftedGreaterThanOrderByWorkoutSessionSessionDateDesc(UUID clientId, double minWeight);
}
