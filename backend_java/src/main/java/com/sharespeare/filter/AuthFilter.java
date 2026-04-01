package com.sharespeare.filter;

import com.sharespeare.util.JsonResponse;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

// Protect routes that require login
@WebFilter("/*")
public class AuthFilter implements Filter {

    // Endpoints that do NOT require authentication
    private static final List<String> PUBLIC_URLS = Arrays.asList(
            "/auth/login",
            "/auth/signup");

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String path = request.getRequestURI().substring(request.getContextPath().length());

        // Let OPTIONS pass for CORS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(req, res);
            return;
        }

        // Allow public URLs
        if (isPublicUrl(path)) {
            chain.doFilter(req, res);
            return;
        }

        HttpSession session = request.getSession(false);
        String headerUserId = request.getHeader("X-User-Id");

        boolean loggedIn = (session != null && session.getAttribute("user_id") != null) || headerUserId != null;

        if (loggedIn) {
            chain.doFilter(req, res);
        } else {
            JsonResponse.send(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
        }
    }

    private boolean isPublicUrl(String path) {
        for (String url : PUBLIC_URLS) {
            if (path.startsWith(url)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void destroy() {
    }
}
