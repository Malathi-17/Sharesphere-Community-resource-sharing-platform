package com.sharespeare.service;

import com.sharespeare.dao.UserDAO;
import com.sharespeare.model.User;
import com.sharespeare.util.PasswordUtil;

public class AuthService {

    private final UserDAO userDAO;

    public AuthService() {
        this.userDAO = new UserDAO();
    }

    public User register(String name, String email, String plainPassword, String role) throws Exception {
        // Check if user already exists
        if (userDAO.getUserByEmail(email) != null) {
            throw new Exception("Email already registered, please login.");
        }

        // Hash password
        String hashedPassword = PasswordUtil.hashPassword(plainPassword);

        // Create user
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(hashedPassword);
        user.setRole(role != null ? role : "USER");

        return userDAO.createUser(user);
    }

    public User login(String email, String plainPassword) throws Exception {
        User user = userDAO.getUserByEmail(email);

        if (user == null) {
            throw new Exception("Invalid email or password.");
        }

        if (!PasswordUtil.checkPassword(plainPassword, user.getPassword())) {
            throw new Exception("Invalid email or password.");
        }

        if (user.isSuspended()) {
            throw new Exception("Your account has been suspended. Please contact admin.");
        }

        return user;
    }

    public boolean updateProfile(int userId, String name, String profilePic) {
        return userDAO.updateUserProfile(userId, name, profilePic);
    }
}
