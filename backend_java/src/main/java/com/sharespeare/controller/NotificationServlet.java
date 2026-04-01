package com.sharespeare.controller;

import com.sharespeare.model.Notification;
import com.sharespeare.service.NotificationService;
import com.sharespeare.util.JsonResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

@WebServlet("/notifications/*")
public class NotificationServlet extends HttpServlet {

    private NotificationService notificationService;

    @Override
    public void init() throws ServletException {
        super.init();
        notificationService = new NotificationService();
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

            if (pathInfo != null && pathInfo.matches("/\\d+")) {
                int targetUserId = Integer.parseInt(pathInfo.split("/")[1]);
                if (targetUserId != userId) {
                    JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                    return;
                }
                List<Notification> notifications = notificationService.getUserNotifications(userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", notifications);

            } else if (pathInfo != null && pathInfo.matches("/unread-count/\\d+")) {
                int targetUserId = Integer.parseInt(pathInfo.split("/")[2]);
                if (targetUserId != userId) {
                    JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                    return;
                }
                int count = notificationService.getUnreadCount(userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success",
                        java.util.Collections.singletonMap("unreadCount", count));
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

            if (pathInfo != null && pathInfo.matches("/\\d+/read")) {
                int notificationId = Integer.parseInt(pathInfo.split("/")[1]);
                notificationService.markAsRead(notificationId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Marked as read");

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
