package com.example.fitnessapp.repository;

import com.example.fitnessapp.model.Review;
import com.example.fitnessapp.model.ReviewStatus;
import com.example.fitnessapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    List<Review> findByClientOrderByCreatedAtDesc(User client);

    List<Review> findByClientAndStatusOrderByCreatedAtDesc(User client, ReviewStatus status);

    // The single review the client is currently working through (not yet archived).
    Optional<Review> findFirstByClientAndStatusInOrderByCreatedAtDesc(User client, List<ReviewStatus> statuses);

    List<Review> findByClientAndStatusInOrderByCreatedAtDesc(User client, List<ReviewStatus> statuses);

    boolean existsByClientAndStatusIn(User client, List<ReviewStatus> statuses);
}
