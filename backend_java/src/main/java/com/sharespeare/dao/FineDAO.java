package com.sharespeare.dao;

import com.sharespeare.model.Fine;
import com.sharespeare.util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class FineDAO {

    public Fine createFine(Fine fine) {
        String sql = "INSERT INTO fines (booking_id, user_id, amount, reason, due_date) " +
                "VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setInt(1, fine.getBookingId());
            pstmt.setInt(2, fine.getUserId());
            pstmt.setBigDecimal(3, fine.getAmount());
            pstmt.setString(4, fine.getReason());
            pstmt.setDate(5, fine.getDueDate());

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        fine.setFineId(rs.getInt(1));
                        return fine;
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Fine> getFinesByUser(int userId) {
        List<Fine> fines = new ArrayList<>();
        String sql = "SELECT f.*, r.name as resource_name " +
                "FROM fines f " +
                "JOIN bookings b ON f.booking_id = b.booking_id " +
                "JOIN resources r ON b.resource_id = r.resource_id " +
                "WHERE f.user_id = ? ORDER BY f.created_at DESC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Fine f = new Fine();
                    f.setFineId(rs.getInt("fine_id"));
                    f.setBookingId(rs.getInt("booking_id"));
                    f.setUserId(rs.getInt("user_id"));
                    f.setAmount(rs.getBigDecimal("amount"));
                    f.setReason(rs.getString("reason"));
                    f.setDueDate(rs.getDate("due_date"));
                    f.setPaid(rs.getBoolean("paid"));
                    f.setCreatedAt(rs.getTimestamp("created_at"));
                    f.setResourceName(rs.getString("resource_name"));
                    fines.add(f);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return fines;
    }

    public boolean markFineAsPaid(int fineId) {
        String sql = "UPDATE fines SET paid = true WHERE fine_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, fineId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // Check if user has more than 3 unpaid fines (used for suspension logic)
    public int getUnpaidFineCount(int userId) {
        String sql = "SELECT COUNT(*) FROM fines WHERE user_id = ? AND paid = false";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return 0;
    }
}
