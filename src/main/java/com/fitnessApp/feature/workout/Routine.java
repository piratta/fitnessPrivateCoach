package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "routines")
public class Routine {

    // Getters y Setters
    @Setter
    @Getter
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @Getter
    @Column(nullable = false)
    private String title; // ej. "Hipertrofia 4 Días"

    @Setter
    @Getter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id", nullable = false)
    private User coach;

    @Getter
    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private User client;

    private Boolean isPreset = false;

    @Getter
    @Setter
    @OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoutineDay> days = new ArrayList<>();

    public Routine() {}

    public boolean isPreset() { return isPreset != null && isPreset; }
    public void setPreset(boolean preset) { isPreset = preset; }

    public void addDay(RoutineDay day) {
        days.add(day);
        day.setRoutine(this);
    }
}
