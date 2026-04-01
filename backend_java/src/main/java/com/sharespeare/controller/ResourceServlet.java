package com.sharespeare.controller;

import com.google.gson.Gson;
import com.sharespeare.model.Resource;
import com.sharespeare.service.ResourceService;
import com.sharespeare.util.JsonResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@WebServlet("/resource/*")
public class ResourceServlet extends HttpServlet {

    private ResourceService resourceService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        super.init();
        resourceService = new ResourceService();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        try {
            if (pathInfo != null && pathInfo.matches("/community/\\d+")) {
                int communityId = Integer.parseInt(pathInfo.split("/")[2]);
                List<Resource> resources = resourceService.getCommunityResources(communityId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", resources);
            } else {
                JsonResponse.send(resp, HttpServletResponse.SC_NOT_FOUND, "Invalid route");
            }
        } catch (Exception e) {
            JsonResponse.send(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        try {
            Integer userId = getUserIdFromRequest(req);
            if (userId == null) {
                JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                return;
            }

            String jsonBody = req.getReader().lines().collect(Collectors.joining(System.lineSeparator()));
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = gson.fromJson(jsonBody, Map.class);

            if (pathInfo == null || pathInfo.equals("/")) {
                // Add Resource (basic JSON handling for now, in a real app this would use
                // multipart/form-data for images)
                int communityId = ((Double) payload.get("community_id")).intValue();
                String name = (String) payload.get("name");
                String description = (String) payload.get("description");
                String category = (String) payload.get("category");
                String itemCondition = (String) payload.get("item_condition");
                int quantity = ((Double) payload.get("quantity")).intValue();

                resourceService.addResource(communityId, userId, name, description, category, itemCondition, quantity,
                        null);
                JsonResponse.send(resp, HttpServletResponse.SC_CREATED, "Resource added successfully");

            } else if (pathInfo.matches("/\\d+/approve")) {
                int resourceId = Integer.parseInt(pathInfo.split("/")[1]);
                int communityId = ((Double) payload.get("community_id")).intValue();

                resourceService.approveResource(resourceId, userId, communityId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Resource approved");
            } else {
                JsonResponse.send(resp, HttpServletResponse.SC_NOT_FOUND, "Not Found");
            }

        } catch (Exception e) {
            JsonResponse.send(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        }
    }

    // Helper extracting user ID
    private Integer getUserIdFromRequest(HttpServletRequest req) {
        Integer user_id = (Integer) req.getSession().getAttribute("user_id");
        if (user_id == null && req.getHeader("X-User-Id") != null) {
            user_id = Integer.parseInt(req.getHeader("X-User-Id"));
        }
        return user_id;
    }
}
