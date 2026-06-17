package com.fitnessApp.fitnessapp.model;

/**
 * Finite State Machine for a client review.
 *
 * PENDING            -> created by the client, waiting for the coach.
 * VALIDATED          -> the coach has reviewed it and left feedback; shown to the client on screen.
 * FEEDBACK_RECEIVED  -> the client acknowledged the feedback. Transient state before archiving.
 * ARCHIVED           -> stored in history; the client is now locked until next_review_at.
 *
 * Allowed transitions are enforced in ReviewService.
 */
public enum ReviewStatus {
    PENDING,
    VALIDATED,
    FEEDBACK_RECEIVED,
    ARCHIVED;

    public boolean canTransitionTo(ReviewStatus target) {
        switch (this) {
            case PENDING:
                return target == VALIDATED;
            case VALIDATED:
                return target == FEEDBACK_RECEIVED;
            case FEEDBACK_RECEIVED:
                return target == ARCHIVED;
            case ARCHIVED:
                return false;
            default:
                return false;
        }
    }
}
