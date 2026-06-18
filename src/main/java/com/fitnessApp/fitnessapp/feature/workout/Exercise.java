package com.fitnessApp.fitnessapp.feature.workout;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Custom exercise added by a coach. Lives next to the hard-coded catalogue served by the
 * frontend — the routine builder presents the union of both lists, so coaches can add their
 * own variants without us shipping a new build.
 */
@Entity
@Table(name = "exercises",
       uniqueConstraints = @UniqueConstraint(name = "uk_exercises_name", columnNames = {"name"}))
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Exercise() {}

    public Exercise(String name) { this.name = name; }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
