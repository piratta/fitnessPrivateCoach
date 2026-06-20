package com.fitnessApp.feature.workout;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "routine_exercise_sets")
@Getter
@Setter
public class RoutineExerciseSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_exercise_id", nullable = false)
    private RoutineExercise routineExercise;

    @Column(nullable = false)
    private int setIndex; // Keeps the order of the sets

    private String reps; // e.g. "10", "8-12", "Fallo"
    private String intensity; // e.g. "RPE 8"
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    public RoutineExerciseSet() {}
}
