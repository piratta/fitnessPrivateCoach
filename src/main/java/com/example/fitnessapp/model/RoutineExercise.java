package com.example.fitnessapp.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "routine_exercises")
public class RoutineExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_day_id", nullable = false)
    private RoutineDay routineDay;

    @Column(nullable = false)
    private String name; // ej. "Press banca"

    @Column(nullable = false)
    private String targetSetsReps; // ej. "4x10"

    private String targetIntensity; // ej. "RIR 2"
    
    private String notes; // ej. "Bajar controlado"
    
    private Boolean isOptional = false;

    public RoutineExercise() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public RoutineDay getRoutineDay() { return routineDay; }
    public void setRoutineDay(RoutineDay routineDay) { this.routineDay = routineDay; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTargetSetsReps() { return targetSetsReps; }
    public void setTargetSetsReps(String targetSetsReps) { this.targetSetsReps = targetSetsReps; }

    public String getTargetIntensity() { return targetIntensity; }
    public void setTargetIntensity(String targetIntensity) { this.targetIntensity = targetIntensity; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public boolean isOptional() { return isOptional != null && isOptional; }
    public void setOptional(boolean optional) { isOptional = optional; }
}
