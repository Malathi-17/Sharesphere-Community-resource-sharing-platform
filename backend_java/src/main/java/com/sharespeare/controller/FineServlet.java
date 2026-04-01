package com.sharespeare.controller;

import com.sharespeare.model.Fine;
import com.sharespeare.service.FineService;
import com.sharespeare.util.JsonResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

@WebServlet("/fine/*")
public class FineServlet extends HttpServlet {

    private FineService fineService;

    @Override
    public void init() throws ServletException {
        super.init();
        fineService = new FineService();
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
                int requestedUserId = Integer.parseInt(pathInfo.split("/")[2]);
                List<Fine> fines = fineService.getUserFines(requestedUserId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Success", fines);

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

            if (pathInfo != null && pathInfo.matches("/\\d+/pay")) {
                int fineId = Integer.parseInt(pathInfo.split("/")[1]);
                fineService.payFine(fineId, userId);
                JsonResponse.send(resp, HttpServletResponse.SC_OK, "Fine paid successfully");

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
