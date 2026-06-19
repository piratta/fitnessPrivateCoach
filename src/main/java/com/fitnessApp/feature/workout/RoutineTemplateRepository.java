package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoutineTemplateRepository extends JpaRepository<RoutineTemplate, UUID> {
    List<RoutineTemplate> findByOwnerCoachOrderByTitleAsc(User ownerCoach);
}
