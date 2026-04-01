package com.sharespeare.controller;

import com.google.gson.Gson;
import com.sharespeare.model.Booking;
import com.sharespeare.service.BookingService;
import com.sharespeare.util.JsonResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@WebServlet("/booking/*")
public class BookingServlet extends HttpServlet {

    private BookingService bookingService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        super.init();
        bookingService = new BookingService();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        try {
            Integer userId = getUserIdFromRequest(req);
            if (userId == null) {
                JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                return;
            }

            if (pathInfo != null && pathInfo.matches("/user/\\d+")) {
                int requestingUserId = Integer.parseInt(pathInfo.split("/")[2]);
                if (userId != requestingUserId) {
                    // Ensure users can only fetch their own bookings unless admin logic is added
                    // here later
                    // Simple guard for now
                }
                List<Booking> bookings = bookingService.getUserBookings(requestingUserId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", bookings);

            } else if (pathInfo != null && pathInfo.matches("/community/\\d+")) {
                int communityId = Integer.parseInt(pathInfo.split("/")[2]);
                List<Booking> bookings = bookingService.getCommunityBookings(communityId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", bookings);

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
                int resourceId = ((Double) payload.get("resource_id")).intValue();
                int communityId = ((Double) payload.get("community_id")).intValue();
                Date startDate = Date.valueOf((String) payload.get("start_date")); // Expects yyyy-[m]m-[d]d
                Date endDate = Date.valueOf((String) payload.get("end_date"));

                Booking booking = bookingService.requestBooking(resourceId, userId, communityId, startDate, endDate);
                JsonResponse.send(resp, HttpServletResponse.SC_CREATED, "Booking requested successfully", booking);

            } else if (pathInfo.matches("/\\d+/approve")) {
                int bookingId = Integer.parseInt(pathInfo.split("/")[1]);
                bookingService.approveBooking(bookingId, userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Booking approved");

            } else if (pathInfo.matches("/\\d+/reject")) {
                int bookingId = Integer.parseInt(pathInfo.split("/")[1]);
                bookingService.rejectBooking(bookingId, userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Booking rejected");

            } else if (pathInfo.matches("/\\d+/return")) {
                int bookingId = Integer.parseInt(pathInfo.split("/")[1]);
                bookingService.returnResource(bookingId, userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Resource returned successfully");

            } else if (pathInfo.matches("/\\d+/extend")) {
                int bookingId = Integer.parseInt(pathInfo.split("/")[1]);
                int days = Integer.parseInt((String) payload.get("days")); // Parsing from string assuming frontend
                                                                           // sends "2"
                bookingService.extendBooking(bookingId, userId, days);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Booking extended successfully");

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
