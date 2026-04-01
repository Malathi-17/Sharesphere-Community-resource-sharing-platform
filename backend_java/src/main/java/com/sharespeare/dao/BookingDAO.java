package com.sharespeare.dao;

import com.sharespeare.model.Booking;
import com.sharespeare.util.DBConnection;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class BookingDAO {

    public Booking createBooking(Booking booking) {
        String sql = "INSERT INTO bookings (resource_id, borrower_id, community_id, start_date, end_date, status) " +
                "VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setInt(1, booking.getResourceId());
            pstmt.setInt(2, booking.getBorrowerId());
            pstmt.setInt(3, booking.getCommunityId());
            pstmt.setDate(4, booking.getStartDate());
            pstmt.setDate(5, booking.getEndDate());
            pstmt.setString(6, "REQUESTED");

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        booking.setBookingId(rs.getInt(1));
                        return getBookingById(booking.getBookingId());
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Booking getBookingById(int bookingId) {
        String sql = "SELECT b.*, r.name as resource_name, r.owner_id, " +
                "u1.name as borrower_name, u2.name as owner_name, c.community_name " +
                "FROM bookings b " +
                "JOIN resources r ON b.resource_id = r.resource_id " +
                "JOIN users u1 ON b.borrower_id = u1.user_id " +
                "JOIN users u2 ON r.owner_id = u2.user_id " +
                "JOIN communities c ON b.community_id = c.community_id " +
                "WHERE b.booking_id = ?";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, bookingId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToBookingFull(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Booking> getBookingsByUser(int userId) {
        List<Booking> bookings = new ArrayList<>();
        String sql = "SELECT b.*, r.name as resource_name, r.owner_id, " +
                "u1.name as borrower_name, u2.name as owner_name, c.community_name " +
                "FROM bookings b " +
                "JOIN resources r ON b.resource_id = r.resource_id " +
                "JOIN users u1 ON b.borrower_id = u1.user_id " +
                "JOIN users u2 ON r.owner_id = u2.user_id " +
                "JOIN communities c ON b.community_id = c.community_id " +
                "WHERE b.borrower_id = ? ORDER BY b.created_at DESC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    bookings.add(mapResultSetToBookingFull(rs));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return bookings;
    }

    public List<Booking> getBookingsByCommunity(int communityId) {
        List<Booking> bookings = new ArrayList<>();
        String sql = "SELECT b.*, r.name as resource_name, r.owner_id, " +
                "u1.name as borrower_name, u2.name as owner_name, c.community_name " +
                "FROM bookings b " +
                "JOIN resources r ON b.resource_id = r.resource_id " +
                "JOIN users u1 ON b.borrower_id = u1.user_id " +
                "JOIN users u2 ON r.owner_id = u2.user_id " +
                "JOIN communities c ON b.community_id = c.community_id " +
                "WHERE b.community_id = ? ORDER BY b.created_at DESC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    bookings.add(mapResultSetToBookingFull(rs));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return bookings;
    }

    public boolean updateBookingStatus(int bookingId, String status) {
        String sql = "UPDATE bookings SET status = ? WHERE booking_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, status);
            pstmt.setInt(2, bookingId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean updateBookingFine(int bookingId, BigDecimal fineAmount) {
        String sql = "UPDATE bookings SET fine_amount = ? WHERE booking_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setBigDecimal(1, fineAmount);
            pstmt.setInt(2, bookingId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean extendBooking(int bookingId, java.sql.Date newEndDate) {
        String sql = "UPDATE bookings SET end_date = ? WHERE booking_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setDate(1, newEndDate);
            pstmt.setInt(2, bookingId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // Advanced: Find active and overdue bookings for scheduled tasks
    public List<Booking> getActiveAndOverdueBookings() {
        List<Booking> bookings = new ArrayList<>();
        String sql = "SELECT * FROM bookings WHERE status IN ('ACTIVE', 'OVERDUE')";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql);
                ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                Booking b = new Booking();
                b.setBookingId(rs.getInt("booking_id"));
                b.setResourceId(rs.getInt("resource_id"));
                b.setBorrowerId(rs.getInt("borrower_id"));
                b.setCommunityId(rs.getInt("community_id"));
                b.setStartDate(rs.getDate("start_date"));
                b.setEndDate(rs.getDate("end_date"));
                b.setStatus(rs.getString("status"));
                b.setFineAmount(rs.getBigDecimal("fine_amount"));
                bookings.add(b);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return bookings;
    }

    // Date Overlap Validation Logic
    public boolean isResourceAvailableForDates(int resourceId, java.sql.Date startDate, java.sql.Date endDate) {
        String sql = "SELECT COUNT(*) FROM bookings " +
                "WHERE resource_id = ? AND status IN ('APPROVED', 'ACTIVE', 'OVERDUE') " +
                "AND (start_date <= ? AND end_date >= ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, resourceId);
            pstmt.setDate(2, endDate);
            pstmt.setDate(3, startDate);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) == 0; // If 0 overlap, it's available
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    private Booking mapResultSetToBookingFull(ResultSet rs) throws SQLException {
        Booking b = new Booking();
        b.setBookingId(rs.getInt("booking_id"));
        b.setResourceId(rs.getInt("resource_id"));
        b.setBorrowerId(rs.getInt("borrower_id"));
        b.setCommunityId(rs.getInt("community_id"));
        b.setStartDate(rs.getDate("start_date"));
        b.setEndDate(rs.getDate("end_date"));
        b.setStatus(rs.getString("status"));
        b.setFineAmount(rs.getBigDecimal("fine_amount"));
        b.setCreatedAt(rs.getTimestamp("created_at"));

        b.setResourceName(rs.getString("resource_name"));
        b.setBorrowerName(rs.getString("borrower_name"));
        b.setOwnerName(rs.getString("owner_name"));
        b.setOwnerId(rs.getInt("owner_id"));
        b.setCommunityName(rs.getString("community_name"));
        return b;
    }
}
