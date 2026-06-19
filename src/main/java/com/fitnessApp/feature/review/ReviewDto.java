package com.fitnessApp.feature.review;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDto {
    private UUID id;
    private String status;
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
    private String clientComments;
    private String coachFeedback;
    private LocalDateTime createdAt;
    private LocalDateTime validatedAt;
    private LocalDateTime archivedAt;
    private List<ImageRef> images;

    // Coach-side context.
    private UUID clientId;
    private String clientName;

    public ReviewDto(Review r, List<ReviewImage> images) {
        this.id = r.getId();
        this.status = r.getStatus().name();
        this.weight = r.getWeight();
        this.waist = r.getWaist();
        this.hip = r.getHip();
        this.neck = r.getNeck();
        this.biceps = r.getBiceps();
        this.leg = r.getLeg();
        this.chest = r.getChest();
        this.calf = r.getCalf();
        this.forearm = r.getForearm();
        this.back = r.getBack();
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageRef {
        private UUID id;
        private String view;
        private boolean visibleForClient;

        public ImageRef(ReviewImage img) {
            this.id = img.getId();
            this.view = img.getView();
            this.visibleForClient = img.isVisibleForClient();
        }
    }
}