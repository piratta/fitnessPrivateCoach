package com.example.fitnessapp.repository;

import com.example.fitnessapp.model.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {
    List<WorkoutSession> findByClientIdOrderBySessionDateDesc(UUID clientId);
}
