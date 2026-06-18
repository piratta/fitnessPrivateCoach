package com.fitnessApp.fitnessapp.repository;

import com.fitnessApp.fitnessapp.model.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
    List<Exercise> findAllByOrderByNameAsc();
    Optional<Exercise> findByNameIgnoreCase(String name);
}
