package com.fitnessApp.fitnessapp.dto;

import com.fitnessApp.fitnessapp.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private UUID id;
    private String email;
    private String name;
    private String lastName;
    private LocalDate birthDate;
    private String role;
    private String status;
    private String goal;
    private String progressionStrategy;
    private String username;
    private boolean mustChangePassword;
    private boolean onboardingCompleted;
    private String reviewFrequency;
    private String billingPlanId;
    private String routineJson;
    private LocalDateTime lastReviewDate;
    private LocalDateTime nextReviewAt;
    private LocalDateTime createdAt;

    // Mantenemos tu constructor personalizado para mapear desde la entidad User
    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();

        // Defensive: legacy rows had lastName accidentally populated with the username
        String ln = user.getLastName();
        this.lastName = (ln != null && ln.equalsIgnoreCase(user.getUsername())) ? null : ln;

        this.birthDate = user.getBirthDate();
        this.role = user.getRole().name();
        this.status = user.getStatus();
        this.goal = user.getGoal();
        this.progressionStrategy = user.getProgressionStrategy();
        this.username = user.getUsername();

        // Los booleanos primitivos en User usan isX()
        this.mustChangePassword = user.isMustChangePassword();

        // ¡LA SOLUCIÓN ESTÁ AQUÍ!
        // Como user.getOnboardingCompleted() devuelve un objeto Boolean que podría ser nulo,
        // usamos Boolean.TRUE.equals() para evitar NullPointerExceptions de forma segura.
        this.onboardingCompleted = Boolean.TRUE.equals(user.getOnboardingCompleted());

        this.reviewFrequency = user.getReviewFrequency();
        this.routineJson = user.getRoutineJson();
        this.lastReviewDate = user.getLastReviewDate();
        this.nextReviewAt = user.getNextReviewAt();
        this.createdAt = user.getCreatedAt();
    }
}