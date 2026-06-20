package com.fitnessApp.feature.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {
}
