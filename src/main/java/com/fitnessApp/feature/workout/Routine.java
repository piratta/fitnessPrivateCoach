package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "routines")
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title; // ej. "Hipertrofia 4 Días"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id", nullable = false)
    private User coach;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private User client;

    private Boolean isPreset = false;

    @OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoutineDay> days = new ArrayList<>();

    public Routine() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public User getCoach() { return coach; }
    public void setCoach(User coach) { this.coach = coach; }

    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }

    public boolean isPreset() { return isPreset != null && isPreset; }
    public void setPreset(boolean preset) { isPreset = preset; }

    public List<RoutineDay> getDays() { return days; }
    public void setDays(List<RoutineDay> days) { this.days = days; }

    public void addDay(RoutineDay day) {
        days.add(day);
        day.setRoutine(this);
    }
}
