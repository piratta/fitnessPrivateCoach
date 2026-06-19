package com.fitnessApp.feature.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Data // Genera automáticamente todos los Getters, Setters, toString, equals y
      // hashCode
@NoArgsConstructor // Genera el constructor vacío (requerido por JPA)
@AllArgsConstructor // Genera un constructor con todos los argumentos (requerido por Builder)
@Builder // Permite crear objetos con el patrón Builder:
         // User.builder().name("Juan").build();
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

    @Builder.Default
    private boolean mustChangePassword = false;

    // True until the client fills in the initial measurements questionnaire on
    // first login.
    @Builder.Default
    private Boolean onboardingCompleted = false;

    // Optional profile data (trainer self-profile + clients).
    private String lastName;
    private java.time.LocalDate birthDate;

    // --- New Fields for Fitness App ---
    private String goal;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_strategies", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "strategy")
    @Builder.Default
    private List<String> strategies = new ArrayList<>();

    @Builder.Default
    private String status = "Activo";

    private String videoLink;
    private LocalDateTime lastReviewDate;

    // Moment from which the next review is allowed. Computed from lastReviewDate +
    // reviewFrequency.
    private LocalDateTime nextReviewAt;

    @Builder.Default
    private String reviewFrequency = "Semanal"; // Semanal, Bisemanal, 3 Semanas, Mensual, Bimensual

    @Builder.Default
    private String progressionStrategy = "Sobrecarga Progresiva (Subir peso)"; // Mantenimiento, Descarga, Subir reps,
                                                                               // etc.

    @Column(columnDefinition = "TEXT")
    private String routineJson;

    @Column(columnDefinition = "TEXT")
    private String nextRoutineJson;

    @Column(columnDefinition = "TEXT")
    private String personalRecordsJson;

    private LocalDateTime routineUpdatedAt;

    private LocalDate routineStartDate;
    private LocalDate routineEndDate;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}