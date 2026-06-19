package com.fitnessApp.feature.workout;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    @Min(value = 0, message = "El RIR no puede ser negativo")
    private Integer rir;

    @Min(value = 1, message = "El RPE debe ser al menos 1")
    @Max(value = 10, message = "El RPE no puede ser mayor a 10")
    private Double rpe;

    private String tempo;

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

    public Integer getRir() { return rir; }
    public void setRir(Integer rir) { this.rir = rir; }

    public Double getRpe() { return rpe; }
    public void setRpe(Double rpe) { this.rpe = rpe; }

    public String getTempo() { return tempo; }
    public void setTempo(String tempo) { this.tempo = tempo; }
}
