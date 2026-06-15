package com.example.fitnessapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id")
    private User coach;

    @Column(unique = true)
    private String username;

    private boolean mustChangePassword = false;

    // True until the client fills in the initial measurements questionnaire on first login.
    private boolean onboardingCompleted = false;

    // Optional profile data (trainer self-profile + clients).
    private String lastName;
    private java.time.LocalDate birthDate;

    // --- New Fields for Fitness App ---
    private String goal;
    private String status = "Activo";
    private String videoLink;
    private LocalDateTime lastReviewDate;
    // Moment from which the next review is allowed. Computed from lastReviewDate + reviewFrequency.
    private LocalDateTime nextReviewAt;
    private String reviewFrequency = "Semanal"; // Semanal, Bisemanal, 3 Semanas, Mensual, Bimensual
    private String progressionStrategy = "Sobrecarga Progresiva (Subir peso)"; // Mantenimiento, Descarga, Subir reps, etc.

    @Column(columnDefinition = "TEXT")
    private String routineJson;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public User() {}

    public User(String email, String passwordHash, String name, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public User getCoach() { return coach; }
    public void setCoach(User coach) { this.coach = coach; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVideoLink() { return videoLink; }
    public void setVideoLink(String videoLink) { this.videoLink = videoLink; }

    public LocalDateTime getLastReviewDate() { return lastReviewDate; }
    public void setLastReviewDate(LocalDateTime lastReviewDate) { this.lastReviewDate = lastReviewDate; }

    public String getReviewFrequency() { return reviewFrequency; }
    public void setReviewFrequency(String reviewFrequency) { this.reviewFrequency = reviewFrequency; }

    public String getProgressionStrategy() { return progressionStrategy; }
    public void setProgressionStrategy(String progressionStrategy) { this.progressionStrategy = progressionStrategy; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public java.time.LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(java.time.LocalDate birthDate) { this.birthDate = birthDate; }

    public LocalDateTime getNextReviewAt() { return nextReviewAt; }
    public void setNextReviewAt(LocalDateTime nextReviewAt) { this.nextReviewAt = nextReviewAt; }

    public String getRoutineJson() { return routineJson; }
    public void setRoutineJson(String routineJson) { this.routineJson = routineJson; }
}
