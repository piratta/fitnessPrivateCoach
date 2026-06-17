package com.fitnessApp.fitnessapp.repository;

import com.fitnessApp.fitnessapp.model.Review;
import com.fitnessApp.fitnessapp.model.ReviewImage;
import com.fitnessApp.fitnessapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, UUID> {

    List<ReviewImage> findByClientOrderByUploadedAtDesc(User client);

    List<ReviewImage> findByReviewOrderByUploadedAtAsc(Review review);

    long countByReview(Review review);
}
