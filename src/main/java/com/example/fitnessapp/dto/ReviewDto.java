package com.example.fitnessapp.dto;

import com.example.fitnessapp.model.Review;
import com.example.fitnessapp.model.ReviewImage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class ReviewDto {
    private UUID id;
    private String status;
    private Double weight;
    private Double waist;
    private Double hip;
    private Double neck;
    private Double biceps;
    private Double leg;
    private String clientComments;
    private String coachFeedback;
    private LocalDateTime createdAt;
    private LocalDateTime validatedAt;
    private LocalDateTime archivedAt;
    private List<ImageRef> images;

    // Coach-side context.
    private UUID clientId;
    private String clientName;

    public ReviewDto() {}

    public ReviewDto(Review r, List<ReviewImage> images) {
        this.id = r.getId();
        this.status = r.getStatus().name();
        this.weight = r.getWeight();
        this.waist = r.getWaist();
        this.hip = r.getHip();
        this.neck = r.getNeck();
        this.biceps = r.getBiceps();
        this.leg = r.getLeg();
        this.clientComments = r.getClientComments();
        this.coachFeedback = r.getCoachFeedback();
        this.createdAt = r.getCreatedAt();
        this.validatedAt = r.getValidatedAt();
        this.archivedAt = r.getArchivedAt();
        if (r.getClient() != null) {
            this.clientId = r.getClient().getId();
            this.clientName = r.getClient().getName();
        }
        if (images != null) {
            this.images = images.stream().map(ImageRef::new).collect(Collectors.toList());
        }
    }

    public static class ImageRef {
        private UUID id;
        private String view;
        public ImageRef() {}
        public ImageRef(ReviewImage img) {
            this.id = img.getId();
            this.view = img.getView();
        }
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }
        public String getView() { return view; }
        public void setView(String view) { this.view = view; }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
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
    public List<ImageRef> getImages() { return images; }
    public void setImages(List<ImageRef> images) { this.images = images; }
    public UUID getClientId() { return clientId; }
    public void setClientId(UUID clientId) { this.clientId = clientId; }
    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }
}
