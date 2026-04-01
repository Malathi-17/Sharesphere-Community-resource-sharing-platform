package com.sharespeare.util;

import com.google.gson.Gson;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

public class JsonResponse {
    @SuppressWarnings("unused")
    private String message;

    @SuppressWarnings("unused")
    private Object data;

    public JsonResponse(String message, Object data) {
        this.message = message;
        this.data = data;
    }

    public JsonResponse(String message) {
        this.message = message;
        this.data = null;
    }

    public static void send(HttpServletResponse resp, int status, String message) throws IOException {
        send(resp, status, message, null);
    }

    public static void send(HttpServletResponse resp, int status, String message, Object data) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        JsonResponse responseObj = new JsonResponse(message, data);
        String json = new Gson().toJson(responseObj);

        resp.getWriter().write(json);
    }
}
