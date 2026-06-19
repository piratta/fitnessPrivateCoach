package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Master routine the coach can save once and assign to multiple clients.
 * Lives per-coach (ownerCoach FK) so two coaches do not see each other's library.
 */
@Setter
@Getter
@Entity
@Table(name = "routine_templates")
public class RoutineTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_coach_id", nullable = false)
    @JsonIgnore
    private User ownerCoach;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String routineJson;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @PreUpdate
    public void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public RoutineTemplate() {}

}
