package com.fitnessApp.feature.review;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fitnessApp.feature.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A photo uploaded as part of a review. Bytes are stored in the database (LOB) so the
 * deployment stays portable across H2 and the ephemeral-disk Postgres prod environment.
 */
@Entity
@Table(name = "review_images")
public class ReviewImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Nullable: photos uploaded during the onboarding questionnaire have no review attached
    // (they go straight to the client's gallery and act as baseline references).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    @JsonIgnore
    private Review review;

    // Owner is denormalized so the gallery can query all images by user cheaply.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnore
    private User client;

    // front | left | right | back (or free-form)
    private String view;

    @Column(nullable = false)
    private String contentType;

    // Plain byte[] (no @Lob) so it maps portably: bytea on Postgres, VARBINARY on H2.
    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false, length = 10_485_760)
    @JsonIgnore
    private byte[] data;

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public ReviewImage() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Review getReview() { return review; }
    public void setReview(Review review) { this.review = review; }

    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }

    public String getView() { return view; }
    public void setView(String view) { this.view = view; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
