package com.example.fitnessapp.service;

import com.example.fitnessapp.model.*;
import com.example.fitnessapp.repository.ReviewImageRepository;
import com.example.fitnessapp.repository.ReviewRepository;
import com.example.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Owns the review lifecycle. All state transitions and the review-creation lock live here so the
 * frontend never decides anything critical — it only reflects the state the backend reports.
 */
@Service
public class ReviewService {

    private static final List<ReviewStatus> ACTIVE_STATUSES =
            List.of(ReviewStatus.PENDING, ReviewStatus.VALIDATED, ReviewStatus.FEEDBACK_RECEIVED);

    @Autowired private ReviewRepository reviewRepository;
    @Autowired private ReviewImageRepository reviewImageRepository;
    @Autowired private UserRepository userRepository;

    /** Computes when the next review is allowed, based on the client's configured frequency. */
    public LocalDateTime computeNextReviewAt(User client, LocalDateTime from) {
        String freq = client.getReviewFrequency() == null ? "" : client.getReviewFrequency().toLowerCase();
        if (freq.contains("bisemanal")) return from.plusWeeks(2);
        if (freq.contains("3 semana")) return from.plusWeeks(3);
        if (freq.contains("bimensual")) return from.plusMonths(2);
        if (freq.contains("mensual")) return from.plusMonths(1);
        // Default: weekly.
        return from.plusWeeks(1);
    }

    public boolean isLocked(User client) {
        return client.getNextReviewAt() != null && LocalDateTime.now().isBefore(client.getNextReviewAt());
    }

    public Review getActiveReview(User client) {
        return reviewRepository
                .findFirstByClientAndStatusInOrderByCreatedAtDesc(client, ACTIVE_STATUSES)
                .orElse(null);
    }

    /**
     * Creates a new PENDING review. Guarded by the lock (current time must be >= next_review_at)
     * and by the single-active-review rule.
     */
    @Transactional
    public Review createReview(User client, Review payload) {
        if (isLocked(client)) {
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "La próxima revisión todavía no está disponible.");
        }
        if (reviewRepository.existsByClientAndStatusIn(client, ACTIVE_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya tienes una revisión en curso.");
        }
        Review review = new Review();
        review.setClient(client);
        review.setStatus(ReviewStatus.PENDING);
        review.setWeight(payload.getWeight());
        review.setWaist(payload.getWaist());
        review.setHip(payload.getHip());
        review.setNeck(payload.getNeck());
        review.setBiceps(payload.getBiceps());
        review.setLeg(payload.getLeg());
        review.setClientComments(payload.getClientComments());
        return reviewRepository.save(review);
    }

    /** Persists an uploaded photo inside the same transaction as the review it belongs to. */
    @Transactional
    public ReviewImage addImage(User client, UUID reviewId, String view, MultipartFile file) {
        Review review = loadOwnedReview(client, reviewId);
        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se pueden añadir fotos a una revisión ya enviada.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo vacío.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Solo se permiten imágenes.");
        }
        ReviewImage image = new ReviewImage();
        image.setReview(review);
        image.setClient(client);
        image.setView(view);
        image.setContentType(contentType);
        try {
            image.setData(file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error leyendo la imagen.");
        }
        return reviewImageRepository.save(image);
    }

    @Transactional
    public void deleteImage(User client, UUID imageId) {
        ReviewImage image = reviewImageRepository.findById(imageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada."));
        if (!image.getClient().getId().equals(client.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes borrar esta imagen.");
        }
        reviewImageRepository.delete(image);
    }

    /** Coach validates a PENDING review and leaves feedback: PENDING -> VALIDATED. */
    @Transactional
    public Review validate(User coach, UUID reviewId, String feedback) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Revisión no encontrada."));
        User client = review.getClient();
        if (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este cliente no es tuyo.");
        }
        transition(review, ReviewStatus.VALIDATED);
        review.setCoachFeedback(feedback);
        review.setValidatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    /**
     * Client acknowledges the feedback. Moves VALIDATED -> FEEDBACK_RECEIVED -> ARCHIVED, archives
     * the review and arms the lock until the next allowed review.
     */
    @Transactional
    public Review acknowledgeFeedback(User client, UUID reviewId) {
        Review review = loadOwnedReview(client, reviewId);
        transition(review, ReviewStatus.FEEDBACK_RECEIVED);
        transition(review, ReviewStatus.ARCHIVED);
        LocalDateTime now = LocalDateTime.now();
        review.setArchivedAt(now);
        reviewRepository.save(review);

        client.setLastReviewDate(now);
        client.setNextReviewAt(computeNextReviewAt(client, now));
        userRepository.save(client);
        return review;
    }

    public List<Review> history(User client) {
        return reviewRepository.findByClientAndStatusOrderByCreatedAtDesc(client, ReviewStatus.ARCHIVED);
    }

    public List<ReviewImage> imagesOf(Review review) {
        return reviewImageRepository.findByReviewOrderByUploadedAtAsc(review);
    }

    public List<ReviewImage> galleryOf(User client) {
        return reviewImageRepository.findByClientOrderByUploadedAtDesc(client);
    }

    public ReviewImage loadImageForViewing(User requester, UUID imageId) {
        ReviewImage image = reviewImageRepository.findById(imageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada."));
        boolean isOwner = image.getClient().getId().equals(requester.getId());
        boolean isCoach = image.getClient().getCoach() != null
                && image.getClient().getCoach().getId().equals(requester.getId());
        if (!isOwner && !isCoach) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin acceso a esta imagen.");
        }
        return image;
    }

    private Review loadOwnedReview(User client, UUID reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Revisión no encontrada."));
        if (!review.getClient().getId().equals(client.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta revisión no es tuya.");
        }
        return review;
    }

    private void transition(Review review, ReviewStatus target) {
        if (!review.getStatus().canTransitionTo(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Transición no permitida: " + review.getStatus() + " -> " + target);
        }
        review.setStatus(target);
    }
}
