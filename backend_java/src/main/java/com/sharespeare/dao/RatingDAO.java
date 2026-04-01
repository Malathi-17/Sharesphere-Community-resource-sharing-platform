package com.sharespeare.dao;

import com.sharespeare.model.Rating;
import com.sharespeare.util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class RatingDAO {

    public Rating createRating(Rating rating) {
        String sql = "INSERT INTO ratings (booking_id, reviewer_id, reviewee_id, rating_value, comment) " +
                "VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setInt(1, rating.getBookingId());
            pstmt.setInt(2, rating.getReviewerId());
            pstmt.setInt(3, rating.getRevieweeId());
            pstmt.setInt(4, rating.getRatingValue());
            pstmt.setString(5, rating.getComment());

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        rating.setRatingId(rs.getInt(1));

                        // Automatically update trust score for reviewee
                        updateUserTrustScore(rating.getRevieweeId());

                        return rating;
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Rating> getRatingsForUser(int userId) {
        List<Rating> ratings = new ArrayList<>();
        String sql = "SELECT * FROM ratings WHERE reviewee_id = ? ORDER BY created_at DESC";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Rating r = new Rating();
                    r.setRatingId(rs.getInt("rating_id"));
                    r.setBookingId(rs.getInt("booking_id"));
                    r.setReviewerId(rs.getInt("reviewer_id"));
                    r.setRevieweeId(rs.getInt("reviewee_id"));
                    r.setRatingValue(rs.getInt("rating_value"));
                    r.setComment(rs.getString("comment"));
                    r.setCreatedAt(rs.getTimestamp("created_at"));
                    ratings.add(r);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return ratings;
    }

    // Helper method to recalculate trust score whenever a new rating is added
    private void updateUserTrustScore(int userId) {
        String sql = "UPDATE users SET trust_score = (" +
                "  SELECT COALESCE(AVG(rating_value), 5.0) FROM ratings WHERE reviewee_id = ?" +
                ") WHERE user_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            pstmt.setInt(2, userId);
            pstmt.executeUpdate();

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
