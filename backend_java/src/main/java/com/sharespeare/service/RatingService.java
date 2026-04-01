package com.sharespeare.service;

import com.sharespeare.dao.RatingDAO;
import com.sharespeare.model.Rating;

import java.util.List;

public class RatingService {

    private final RatingDAO ratingDAO;

    public RatingService() {
        this.ratingDAO = new RatingDAO();
    }

    public Rating addRating(int bookingId, int reviewerId, int revieweeId, int ratingValue, String comment)
            throws Exception {
        if (ratingValue < 1 || ratingValue > 5) {
            throw new Exception("Rating must be between 1 and 5.");
        }

        // Additional business logic: Ensure booking is actually RETURNED/CLOSED before
        // allowing rating
        // (Omitted for brevity, assuming controller validates this or trusting input)

        Rating rating = new Rating();
        rating.setBookingId(bookingId);
        rating.setReviewerId(reviewerId);
        rating.setRevieweeId(revieweeId);
        rating.setRatingValue(ratingValue);
        rating.setComment(comment);

        // The DAO handles the automatic recalculation of the trust score
        return ratingDAO.createRating(rating);
    }

    public List<Rating> getUserRatings(int userId) {
        return ratingDAO.getRatingsForUser(userId);
    }
}
