package com.example.fitnessapp.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnore
    private User client;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status = ReviewStatus.PENDING;

    // Measurement snapshot taken at the moment of the review.
    private Double weight;
    private Double waist;
    private Double hip;
    private Double neck;
    private Double biceps;
    private Double leg;
    private Double chest;
    private Double calf;
    private Double forearm;
    private Double back;

    @Column(columnDefinition = "TEXT")
    private String clientComments;

    @Column(columnDefinition = "TEXT")
    private String coachFeedback;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime validatedAt;
    private LocalDateTime archivedAt;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<ReviewImage> images = new ArrayList<>();

    public Review() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }

    public ReviewStatus getStatus() { return status; }
    public void setStatus(ReviewStatus status) { this.status = status; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getWaist() { return waist; }
    public void setWaist(Double waist) { this.waist = waist; }

    public Double getHip() { return hip; }
    public void setHip(Double hip) { this.hip = hip; }

    public Double getNeck() { return neck; }
    public void setNeck(Double neck) { this.neck = neck; }

    public Double getBiceps() { return biceps; }
    public void setBiceps(Double biceps) { this.biceps = biceps; }

    public Double getLeg() { return leg; }
    public void setLeg(Double leg) { this.leg = leg; }

    public Double getChest() { return chest; }
    public void setChest(Double chest) { this.chest = chest; }

    public Double getCalf() { return calf; }
    public void setCalf(Double calf) { this.calf = calf; }

    public Double getForearm() { return forearm; }
    public void setForearm(Double forearm) { this.forearm = forearm; }

    public Double getBack() { return back; }
    public void setBack(Double back) { this.back = back; }

    public String getClientComments() { return clientComments; }
    public void setClientComments(String clientComments) { this.clientComments = clientComments; }

    public String getCoachFeedback() { return coachFeedback; }
    public void setCoachFeedback(String coachFeedback) { this.coachFeedback = coachFeedback; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getValidatedAt() { return validatedAt; }
    public void setValidatedAt(LocalDateTime validatedAt) { this.validatedAt = validatedAt; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public List<ReviewImage> getImages() { return images; }
    public void setImages(List<ReviewImage> images) { this.images = images; }
}
