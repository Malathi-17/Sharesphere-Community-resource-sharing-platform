package com.sharespeare.listener;

import com.sharespeare.service.FineService;
import com.sharespeare.util.DBConnection;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@WebListener
public class AppContextListener implements ServletContextListener {

    private ScheduledExecutorService scheduler;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("Starting ShareSpeare API - Initializing resources...");

        // 1. Force the static block in DBConnection to run and initialize HikariCP
        try {
            DBConnection.getConnection().close();
            System.out.println("Database pool verified.");
        } catch (Exception e) {
            System.err.println("Fatal: Database connection pool failed to initialize.");
            e.printStackTrace();
        }

        // 2. Start Background Fine Scanner
        System.out.println("Starting background Fine Scanner thread...");
        FineService fineService = new FineService();
        scheduler = Executors.newSingleThreadScheduledExecutor();

        // Run every 1 hour
        scheduler.scheduleAtFixedRate(() -> {
            System.out.println("[BG_TASK] Scanning for active overdue bookings...");
            try {
                fineService.scanAndGenerateFines();
            } catch (Exception e) {
                System.err.println("[BG_TASK] Error during fine scan: " + e.getMessage());
            }
        }, 0, 1, TimeUnit.HOURS);
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("Stopping ShareSpeare API - Releasing resources...");

        // Stop background thread
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdown();
            System.out.println("Background Fine Scanner stopped.");
        }

        // Close DB pool
        DBConnection.closePool();
    }
}
