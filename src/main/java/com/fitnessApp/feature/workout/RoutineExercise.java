package com.fitnessApp.feature.workout;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
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
    private String name;

    @Column(nullable = false)
    private int exerciseIndex;

    private Boolean isOptional = false;

    @OneToMany(mappedBy = "routineExercise", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoutineExerciseSet> sets = new ArrayList<>();

    public RoutineExercise() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public RoutineDay getRoutineDay() { return routineDay; }
    public void setRoutineDay(RoutineDay routineDay) { this.routineDay = routineDay; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getExerciseIndex() { return exerciseIndex; }
    public void setExerciseIndex(int exerciseIndex) { this.exerciseIndex = exerciseIndex; }

    public boolean isOptional() { return isOptional != null && isOptional; }
    public void setOptional(boolean optional) { isOptional = optional; }

    public List<RoutineExerciseSet> getSets() { return sets; }
    public void setSets(List<RoutineExerciseSet> sets) { this.sets = sets; }

    public void addSet(RoutineExerciseSet set) {
        sets.add(set);
        set.setRoutineExercise(this);
    }
}
