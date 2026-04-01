package com.sharespeare.dao;

import com.sharespeare.model.Resource;
import com.sharespeare.util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ResourceDAO {

    public Resource createResource(Resource resource) {
        String sql = "INSERT INTO resources (community_id, owner_id, name, description, category, " +
                "item_condition, quantity, available_quantity, image_url, status, approval_status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setInt(1, resource.getCommunityId());
            pstmt.setInt(2, resource.getOwnerId());
            pstmt.setString(3, resource.getName());
            pstmt.setString(4, resource.getDescription());
            pstmt.setString(5, resource.getCategory());
            pstmt.setString(6, resource.getItemCondition());
            pstmt.setInt(7, resource.getQuantity());
            pstmt.setInt(8, resource.getQuantity()); // initially available = total
            pstmt.setString(9, resource.getImageUrl());
            pstmt.setString(10, "AVAILABLE");
            pstmt.setString(11, "PENDING"); // Needs admin approval usually

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        resource.setResourceId(rs.getInt(1));
                        return getResourceById(resource.getResourceId());
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Resource getResourceById(int resourceId) {
        String sql = "SELECT * FROM resources WHERE resource_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, resourceId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToResource(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Resource> getResourcesByCommunity(int communityId) {
        List<Resource> resources = new ArrayList<>();
        String sql = "SELECT r.*, u.name as owner_name FROM resources r " +
                "JOIN users u ON r.owner_id = u.user_id " +
                "WHERE r.community_id = ? " +
                "ORDER BY r.created_at DESC";

        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, communityId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Resource res = mapResultSetToResource(rs);
                    res.setOwnerName(rs.getString("owner_name"));
                    resources.add(res);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return resources;
    }

    public boolean updateResourceStatus(int resourceId, String status) {
        String sql = "UPDATE resources SET status = ? WHERE resource_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, status);
            pstmt.setInt(2, resourceId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean updateApprovalStatus(int resourceId, String approvalStatus) {
        String sql = "UPDATE resources SET approval_status = ? WHERE resource_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, approvalStatus);
            pstmt.setInt(2, resourceId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean decrementAvailableQuantity(int resourceId) {
        String sql = "UPDATE resources SET available_quantity = available_quantity - 1 " +
                "WHERE resource_id = ? AND available_quantity > 0";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, resourceId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean incrementAvailableQuantity(int resourceId) {
        String sql = "UPDATE resources SET available_quantity = available_quantity + 1 " +
                "WHERE resource_id = ? AND available_quantity < quantity";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, resourceId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public boolean deleteResource(int resourceId) {
        String sql = "DELETE FROM resources WHERE resource_id = ?";
        try (Connection conn = DBConnection.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, resourceId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    private Resource mapResultSetToResource(ResultSet rs) throws SQLException {
        Resource res = new Resource();
        res.setResourceId(rs.getInt("resource_id"));
        res.setCommunityId(rs.getInt("community_id"));
        res.setOwnerId(rs.getInt("owner_id"));
        res.setName(rs.getString("name"));
        res.setDescription(rs.getString("description"));
        res.setCategory(rs.getString("category"));
        res.setItemCondition(rs.getString("item_condition"));
        res.setQuantity(rs.getInt("quantity"));
        res.setAvailableQuantity(rs.getInt("available_quantity"));
        res.setImageUrl(rs.getString("image_url"));
        res.setStatus(rs.getString("status"));
        res.setApprovalStatus(rs.getString("approval_status"));
        res.setCreatedAt(rs.getTimestamp("created_at"));
        return res;
    }
}
