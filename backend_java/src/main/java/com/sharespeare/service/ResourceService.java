package com.sharespeare.service;

import com.sharespeare.dao.CommunityDAO;
import com.sharespeare.dao.ResourceDAO;
import com.sharespeare.model.Resource;

import java.util.List;

public class ResourceService {

    private final ResourceDAO resourceDAO;
    private final CommunityDAO communityDAO;

    public ResourceService() {
        this.resourceDAO = new ResourceDAO();
        this.communityDAO = new CommunityDAO();
    }

    public Resource addResource(int communityId, int ownerId, String name, String description,
            String category, String itemCondition, int quantity, String imageUrl) throws Exception {

        // Logic check: Validate owner is actually part of the community
        String role = communityDAO.getUserRoleInCommunity(communityId, ownerId);
        if (role == null) {
            throw new Exception("You must join the community before adding resources to it.");
        }

        Resource resource = new Resource();
        resource.setCommunityId(communityId);
        resource.setOwnerId(ownerId);
        resource.setName(name);
        resource.setDescription(description);
        resource.setCategory(category);
        resource.setItemCondition(itemCondition);
        resource.setQuantity(quantity);
        resource.setImageUrl(imageUrl);

        return resourceDAO.createResource(resource);
    }

    public List<Resource> getCommunityResources(int communityId) {
        return resourceDAO.getResourcesByCommunity(communityId);
    }

    public Resource getResourceById(int resourceId) {
        return resourceDAO.getResourceById(resourceId);
    }

    public void approveResource(int resourceId, int adminId, int communityId) throws Exception {
        // Validate admin
        String role = communityDAO.getUserRoleInCommunity(communityId, adminId);
        if (!"ADMIN".equals(role)) {
            throw new Exception("Unauthorized. Only community admins can approve resources.");
        }
        resourceDAO.updateApprovalStatus(resourceId, "APPROVED");
    }

    public void deleteResource(int resourceId, int requesterId, int communityId) throws Exception {
        // Only owner or community admin can delete
        Resource res = resourceDAO.getResourceById(resourceId);
        if (res == null)
            throw new Exception("Resource not found");

        String role = communityDAO.getUserRoleInCommunity(communityId, requesterId);

        if (res.getOwnerId() != requesterId && !"ADMIN".equals(role)) {
            throw new Exception("Unauthorized to delete this resource.");
        }

        resourceDAO.deleteResource(resourceId);
    }
}
