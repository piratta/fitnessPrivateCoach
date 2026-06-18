package com.fitnessApp.feature.review;

import com.fitnessApp.feature.user.Role;
import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired private ReviewService reviewService;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private UserRepository userRepository;

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    private ReviewDto toDto(Review review) {
        return new ReviewDto(review, reviewService.imagesOf(review));
    }

    // ---- Client: lock status / countdown -------------------------------------------------

    @GetMapping("/lock-status")
    public ResponseEntity<Map<String, Object>> lockStatus() {
        User client = currentUser();
        // Normalize nextReviewAt to start-of-day so legacy rows recorded at random hours show
        // the unlock at 00:00, matching the new policy. Recompute lock + countdown from there.
        LocalDateTime stored = client.getNextReviewAt();
        LocalDateTime nextAt = stored == null ? null : stored.toLocalDate().atStartOfDay();
        LocalDateTime now = LocalDateTime.now();
        boolean locked = nextAt != null && now.isBefore(nextAt);

        Map<String, Object> body = new HashMap<>();
        body.put("locked", locked);
        body.put("nextReviewAt", nextAt);
        body.put("lastReviewDate", client.getLastReviewDate());
        if (locked) {
            Duration remaining = Duration.between(now, nextAt);
            body.put("secondsRemaining", Math.max(0, remaining.getSeconds()));
            body.put("daysRemaining", Math.max(0, remaining.toDays()));
            body.put("hoursRemaining", Math.max(0, remaining.toHours() % 24));
        }
        return ResponseEntity.ok(body);
    }

    // ---- Client: active review + history -------------------------------------------------

    @GetMapping("/active")
    public ResponseEntity<ReviewDto> active() {
        User client = currentUser();
        Review active = reviewService.getActiveReview(client);
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(toDto(active));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ReviewDto>> history() {
        User client = currentUser();
        List<ReviewDto> dtos = reviewService.history(client).stream()
                .map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ---- Client: create review (guarded by lock) ----------------------------------------

    @PostMapping
    public ResponseEntity<ReviewDto> create(@RequestBody Review payload) {
        User client = currentUser();
        Review created = reviewService.createReview(client, payload);
        return ResponseEntity.ok(toDto(created));
    }

    // ---- Client: images ------------------------------------------------------------------

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReviewDto.ImageRef> uploadImage(
            @PathVariable("id") UUID reviewId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "view", required = false) String view) {
        User client = currentUser();
        ReviewImage saved = reviewService.addImage(client, reviewId, view, file);
        return ResponseEntity.ok(new ReviewDto.ImageRef(saved));
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<Void> deleteImage(@PathVariable("imageId") UUID imageId) {
        reviewService.deleteImage(currentUser(), imageId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/images/{imageId}")
    public ResponseEntity<byte[]> getImage(@PathVariable("imageId") UUID imageId) {
        ReviewImage image = reviewService.loadImageForViewing(currentUser(), imageId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .body(image.getData());
    }

    // ---- Client: gallery (all photos uploaded by the user) -------------------------------

    @GetMapping("/gallery")
    public ResponseEntity<List<Map<String, Object>>> gallery() {
        User client = currentUser();
        List<Map<String, Object>> body = reviewService.galleryOf(client).stream().map(img -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", img.getId());
            m.put("view", img.getView());
            m.put("uploadedAt", img.getUploadedAt());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(body);
    }

    // ---- Client: acknowledge feedback (archives + arms lock) -----------------------------

    @PostMapping("/{id}/feedback-received")
    public ResponseEntity<Map<String, Object>> feedbackReceived(@PathVariable("id") UUID reviewId) {
        User client = currentUser();
        reviewService.acknowledgeFeedback(client, reviewId);
        Map<String, Object> body = new HashMap<>();
        body.put("nextReviewAt", client.getNextReviewAt());
        return ResponseEntity.ok(body);
    }

    // ---- Coach: pending reviews + validation ---------------------------------------------

    @GetMapping("/pending")
    public ResponseEntity<List<ReviewDto>> pending() {
        User coach = currentUser();
        List<ReviewDto> dtos = reviewRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReviewStatus.PENDING)
                .filter(r -> r.getClient().getCoach() != null
                        && r.getClient().getCoach().getId().equals(coach.getId()))
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/by-client/{clientId}")
    public ResponseEntity<List<ReviewDto>> byClient(@PathVariable("clientId") UUID clientId) {
        User coach = currentUser();
        User client = userRepository.findById(clientId).orElseThrow();
        if (coach.getRole() != Role.SUPER_ADMIN &&
                (client.getCoach() == null || !client.getCoach().getId().equals(coach.getId()))) {
            return ResponseEntity.status(403).build();
        }
        List<ReviewDto> dtos = reviewRepository.findByClientOrderByCreatedAtDesc(client).stream()
                .map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<ReviewDto> validate(@PathVariable("id") UUID reviewId,
                                              @RequestBody Map<String, String> body) {
        User coach = currentUser();
        Review validated = reviewService.validate(coach, reviewId, body.get("feedback"));
        return ResponseEntity.ok(toDto(validated));
    }
}
