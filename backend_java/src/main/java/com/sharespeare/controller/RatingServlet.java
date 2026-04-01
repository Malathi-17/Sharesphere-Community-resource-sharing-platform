package com.sharespeare.controller;

import com.google.gson.Gson;
import com.sharespeare.model.Rating;
import com.sharespeare.service.RatingService;
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

@WebServlet("/rating/*")
public class RatingServlet extends HttpServlet {

    private RatingService ratingService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        super.init();
        ratingService = new RatingService();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        try {
            if (pathInfo != null && pathInfo.matches("/user/\\d+")) {
                int requestingUserId = Integer.parseInt(pathInfo.split("/")[2]);
                List<Rating> ratings = ratingService.getUserRatings(requestingUserId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", ratings);
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
                int bookingId = ((Double) payload.get("booking_id")).intValue();
                int revieweeId = ((Double) payload.get("reviewee_id")).intValue();
                int ratingValue = ((Double) payload.get("rating")).intValue();
                String comment = (String) payload.get("comment");

                Rating rating = ratingService.addRating(bookingId, userId, revieweeId, ratingValue, comment);
                JsonResponse.send(resp, HttpServletResponse.SC_CREATED, "Rating submitted successfully", rating);

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
