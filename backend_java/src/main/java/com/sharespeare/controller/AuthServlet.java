package com.sharespeare.controller;

import com.google.gson.Gson;
import com.sharespeare.model.User;
import com.sharespeare.service.AuthService;
import com.sharespeare.util.JsonResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;

@WebServlet("/auth/*")
public class AuthServlet extends HttpServlet {

    private AuthService authService;
    private Gson gson;

    @Override
    public void init() throws ServletException {
        super.init();
        authService = new AuthService();
        gson = new Gson();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();

        if (pathInfo == null) {
            JsonResponse.send(resp, HttpServletResponse.SC_BAD_REQUEST, "Missing path");
            return;
        }

        try {
            BufferedReader reader = req.getReader();
            User requestUser = gson.fromJson(reader, User.class);

            if (pathInfo.equals("/signup")) {
                User createdUser = authService.register(
                        requestUser.getName(),
                        requestUser.getEmail(),
                        requestUser.getPassword(),
                        requestUser.getRole());
                // Prevent sending back the hash
                createdUser.setPassword(null);
                JsonResponse.send(resp, HttpServletResponse.SC_CREATED, "User registered successfully", createdUser);

            } else if (pathInfo.equals("/login")) {
                User loggedInUser = authService.login(requestUser.getEmail(), requestUser.getPassword());

                // Session management (Using simple session attributes for now)
                req.getSession().setAttribute("user_id", loggedInUser.getUserId());
                req.getSession().setAttribute("role", loggedInUser.getRole());

                // Remove password hash from response
                loggedInUser.setPassword(null);

                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Login successful", loggedInUser);

            } else if (pathInfo.equals("/logout")) {
                req.getSession().invalidate();
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Logged out successfully");
            } else {
                JsonResponse.send(resp, HttpServletResponse.SC_NOT_FOUND, "Unknown auth action");
            }

        } catch (Exception e) {
            JsonResponse.send(resp, HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
        }
    }
}
