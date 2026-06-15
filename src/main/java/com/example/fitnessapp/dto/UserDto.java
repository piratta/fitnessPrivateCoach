package com.example.fitnessapp.dto;

import com.example.fitnessapp.model.User;
import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;
    private String name;
    private String role;
    private String status;
    private String goal;
    private String progressionStrategy;

    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.role = user.getRole().name();
        this.status = user.getStatus();
        this.goal = user.getGoal();
        this.progressionStrategy = user.getProgressionStrategy();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
}
