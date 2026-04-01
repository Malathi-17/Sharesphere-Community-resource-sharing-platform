package com.sharespeare.service;

import com.sharespeare.dao.CommunityDAO;
import com.sharespeare.model.Community;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class CommunityService {

    private final CommunityDAO communityDAO;

    public CommunityService() {
        this.communityDAO = new CommunityDAO();
    }

    public Community createCommunity(String name, String type, String description, int createdBy,
            BigDecimal fineRate, int borrowLimit, boolean joinApproval) {
        Community comm = new Community();
        comm.setCommunityName(name);
        comm.setCommunityType(type);
        comm.setDescription(description);
        comm.setCreatedBy(createdBy);
        comm.setFineRate(fineRate);
        comm.setBorrowLimit(borrowLimit);
        comm.setJoinApproval(joinApproval);

        return communityDAO.createCommunity(comm);
    }

    public List<Map<String, Object>> getCommunities(int userId) {
        return communityDAO.getAllCommunitiesWithMemberStatus(userId);
    }

    public Community getCommunityDetails(int communityId) {
        return communityDAO.getCommunityById(communityId);
    }

    public void joinCommunity(int communityId, int userId) throws Exception {
        // Check if community requires approval
        Community comm = communityDAO.getCommunityById(communityId);
        if (comm == null) {
            throw new Exception("Community not found.");
        }

        String role = communityDAO.getUserRoleInCommunity(communityId, userId);
        if (role != null) {
            throw new Exception("You are already a member of this community.");
        }

        if (comm.isJoinApproval()) {
            throw new Exception(
                    "This community requires admin approval to join. Approval logic not fully implemented yet.");
            // In a full implementation, this might insert into a `join_requests` table
        } else {
            communityDAO.addMember(communityId, userId, "MEMBER");
        }
    }

    public void leaveCommunity(int communityId, int userId) throws Exception {
        String role = communityDAO.getUserRoleInCommunity(communityId, userId);
        if (role == null) {
            throw new Exception("You are not a member of this community.");
        }
        if ("ADMIN".equals(role)) {
            // Cannot easily leave if admin, perhaps require transferring ownership
            throw new Exception("Community admins cannot leave without transferring ownership.");
        }
        communityDAO.removeMember(communityId, userId);
    }

    public List<Map<String, Object>> getCommunityMembers(int communityId) {
        return communityDAO.getCommunityMembers(communityId);
    }

    public void updateSettings(int communityId, int requesterId, BigDecimal fineRate, int borrowLimit,
            boolean joinApproval) throws Exception {
        String role = communityDAO.getUserRoleInCommunity(communityId, requesterId);
        if (!"ADMIN".equals(role)) {
            throw new Exception("Unauthorized. Only community admins can update settings.");
        }
        communityDAO.updateCommunitySettings(communityId, fineRate, borrowLimit, joinApproval);
    }
}
