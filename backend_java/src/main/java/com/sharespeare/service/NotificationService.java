package com.sharespeare.service;

import com.sharespeare.dao.NotificationDAO;
import com.sharespeare.model.Notification;

import java.util.List;

public class NotificationService {

    private final NotificationDAO notificationDAO;

    public NotificationService() {
        this.notificationDAO = new NotificationDAO();
    }

    public void addNotification(int userId, String message, String type) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setMessage(message);
        n.setType(type);

        notificationDAO.createNotification(n);
    }

    public List<Notification> getUserNotifications(int userId) {
        return notificationDAO.getNotificationsForUser(userId);
    }

    public int getUnreadCount(int userId) {
        return notificationDAO.getUnreadCount(userId);
    }

    public void markAsRead(int notificationId) {
        notificationDAO.markNotificationAsRead(notificationId);
    }
}
