package com.sharespeare.controller;

import com.google.gson.Gson;
import com.sharespeare.service.CommunityService;
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

@WebServlet("/community/*")
public class CommunityServlet extends HttpServlet {

    private CommunityService communityService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        super.init();
        communityService = new CommunityService();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        try {
            // Must have a valid session to fetch community data in this app
            Integer userId = (Integer) req.getSession().getAttribute("user_id");
            if (userId == null) {
                // Because we don't have a firm JWT flow yet, we'll allow mock headers for easy
                // testing:
                String headerUserId = req.getHeader("X-User-Id");
                if (headerUserId != null) {
                    userId = Integer.parseInt(headerUserId);
                } else {
                    JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                    return;
                }
            }

            if (pathInfo == null || pathInfo.equals("/")) {
                // List communities
                List<Map<String, Object>> communities = communityService.getCommunities(userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", communities);

            } else if (pathInfo.matches("/\\d+")) {
                // Get clear detail for one community
                int communityId = Integer.parseInt(pathInfo.substring(1));
                Object details = communityService.getCommunityDetails(communityId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", details);

            } else if (pathInfo.matches("/\\d+/members")) {
                // Get members of a community
                int communityId = Integer.parseInt(pathInfo.split("/")[1]);
                List<Map<String, Object>> members = communityService.getCommunityMembers(communityId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", members);

            } else {
                JsonResponse.send(resp, HttpServletResponse.SC_NOT_FOUND, "Not Found");
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

            // Read JSON body
            String jsonBody = req.getReader().lines().collect(Collectors.joining(System.lineSeparator()));
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = gson.fromJson(jsonBody, Map.class);

            if (pathInfo == null || pathInfo.equals("/")) {
                // Create Community
                communityService.createCommunity(
                        (String) payload.get("community_name"),
                        (String) payload.get("community_type"),
                        (String) payload.get("description"),
                        userId,
                        null, // Fine rate (defaults in DAO)
                        3, // Borrow limit
                        false // Join approval
                );
                JsonResponse.send(resp, HttpServletResponse.SC_CREATED, "Community created successfully");

            } else if (pathInfo.matches("/join/\\d+")) {
                int communityId = Integer.parseInt(pathInfo.split("/")[2]);
                communityService.joinCommunity(communityId, userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Joined community successfully");

            } else {
                JsonResponse.send(resp, HttpServletResponse.SC_NOT_FOUND, "Not Found");
            }
        } catch (Exception e) {
            JsonResponse.send(resp, HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        }
    }

    // Helper extracting user ID, simulating middleware
    private Integer getUserIdFromRequest(HttpServletRequest req) {
        Integer user_id = (Integer) req.getSession().getAttribute("user_id");
        if (user_id == null && req.getHeader("X-User-Id") != null) {
            user_id = Integer.parseInt(req.getHeader("X-User-Id"));
        }
        return user_id;
    }
}
