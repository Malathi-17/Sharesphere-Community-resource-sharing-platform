package com.sharespeare.dao;

import com.sharespeare.model.Community;
import com.sharespeare.util.DBConnection;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CommunityDAO {

    public Community createCommunity(Community community) {
        String sql = "INSERT INTO communities (community_name, community_type, description, created_by, fine_rate, borrow_limit, join_approval) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, community.getCommunityName());
            pstmt.setString(2, community.getCommunityType());
            pstmt.setString(3, community.getDescription());
            pstmt.setInt(4, community.getCreatedBy());
            pstmt.setBigDecimal(5, community.getFineRate() != null ? community.getFineRate() : new BigDecimal("10.00"));
            pstmt.setInt(6, community.getBorrowLimit() > 0 ? community.getBorrowLimit() : 3);
            pstmt.setBoolean(7, community.isJoinApproval());

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        community.setCommunityId(rs.getInt(1));

                        // Automatically add the creator as an ADMIN member
                        addMember(community.getCommunityId(), community.getCreatedBy(), "ADMIN");

                        return getCommunityById(community.getCommunityId());
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Community getCommunityById(int communityId) {
        String sql = "SELECT * FROM communities WHERE community_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToCommunity(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Map<String, Object>> getAllCommunitiesWithMemberStatus(int userId) {
        List<Map<String, Object>> communities = new ArrayList<>();
        // Query joins communities with member counts, and checks if the given user is a
        // member
        String sql = "SELECT c.*, " +
                "(SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.community_id) AS member_count, " +
                "CASE WHEN EXISTS (SELECT 1 FROM community_members cm2 WHERE cm2.community_id = c.community_id AND cm2.user_id = ?) THEN TRUE ELSE FALSE END AS is_joined "
                +
                "FROM communities c ORDER BY c.created_at DESC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rs.getInt("community_id"));
                    map.put("community_name", rs.getString("community_name"));
                    map.put("community_type", rs.getString("community_type"));
                    map.put("description", rs.getString("description"));
                    map.put("members", rs.getInt("member_count"));
                    map.put("joined", rs.getBoolean("is_joined"));
                    communities.add(map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return communities;
    }

    public boolean updateCommunitySettings(int communityId, BigDecimal fineRate, int borrowLimit,
            boolean joinApproval) {
        String sql = "UPDATE communities SET fine_rate = ?, borrow_limit = ?, join_approval = ? WHERE community_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setBigDecimal(1, fineRate);
            pstmt.setInt(2, borrowLimit);
            pstmt.setBoolean(3, joinApproval);
            pstmt.setInt(4, communityId);

            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean deleteCommunity(int communityId) {
        String sql = "DELETE FROM communities WHERE community_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // Community Members logic
    public boolean addMember(int communityId, int userId, String role) {
        String sql = "INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            pstmt.setInt(2, userId);
            pstmt.setString(3, role != null ? role : "MEMBER");

            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean removeMember(int communityId, int userId) {
        String sql = "DELETE FROM community_members WHERE community_id = ? AND user_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            pstmt.setInt(2, userId);

            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public String getUserRoleInCommunity(int communityId, int userId) {
        String sql = "SELECT role FROM community_members WHERE community_id = ? AND user_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            pstmt.setInt(2, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("role");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null; // Not a member
    }

    public List<Map<String, Object>> getCommunityMembers(int communityId) {
        List<Map<String, Object>> members = new ArrayList<>();
        String sql = "SELECT u.user_id, u.name, u.email, cm.role, cm.joined_at " +
                "FROM community_members cm JOIN users u ON cm.user_id = u.user_id " +
                "WHERE cm.community_id = ? ORDER BY cm.joined_at ASC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("user_id", rs.getInt("user_id"));
                    map.put("name", rs.getString("name"));
                    map.put("email", rs.getString("email"));
                    map.put("role", rs.getString("role"));
                    map.put("joined_at", rs.getTimestamp("joined_at"));
                    members.add(map);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return members;
    }

    private Community mapResultSetToCommunity(ResultSet rs) throws SQLException {
        Community comm = new Community();
        comm.setCommunityId(rs.getInt("community_id"));
        comm.setCommunityName(rs.getString("community_name"));
        comm.setCommunityType(rs.getString("community_type"));
        comm.setDescription(rs.getString("description"));
        comm.setCreatedBy(rs.getInt("created_by"));
        comm.setFineRate(rs.getBigDecimal("fine_rate"));
        comm.setBorrowLimit(rs.getInt("borrow_limit"));
        comm.setJoinApproval(rs.getBoolean("join_approval"));
        comm.setCreatedAt(rs.getTimestamp("created_at"));
        return comm;
    }
}
