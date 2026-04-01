package com.sharespeare.service;

import com.sharespeare.dao.BookingDAO;
import com.sharespeare.dao.CommunityDAO;
import com.sharespeare.dao.FineDAO;
import com.sharespeare.dao.UserDAO;
import com.sharespeare.model.Booking;
import com.sharespeare.model.Community;
import com.sharespeare.model.Fine;

import java.math.BigDecimal;
import java.sql.Date;
import java.util.List;

public class FineService {

    private final FineDAO fineDAO;
    private final BookingDAO bookingDAO;
    private final CommunityDAO communityDAO;
    private final UserDAO userDAO;

    public FineService() {
        this.fineDAO = new FineDAO();
        this.bookingDAO = new BookingDAO();
        this.communityDAO = new CommunityDAO();
        this.userDAO = new UserDAO();
    }

    public List<Fine> getUserFines(int userId) {
        return fineDAO.getFinesByUser(userId);
    }

    public void payFine(int fineId, int userId) throws Exception {
        // Simulate payment success immediately for now
        boolean success = fineDAO.markFineAsPaid(fineId);
        if (!success) {
            throw new Exception("Fine payment failed or fine not found.");
        }

        // Check if user should be unsuspended after paying
        checkAndUnsuspendUser(userId);
    }

    // Core Logic: Escalation Rules - Check if user has too many unpaid fines (> 3)
    public void evaluateUserSuspension(int userId) {
        int unpaidCount = fineDAO.getUnpaidFineCount(userId);
        if (unpaidCount > 3) {
            userDAO.setSuspensionStatus(userId, true);
        }
    }

    // Core Logic: Reverse Escalation
    private void checkAndUnsuspendUser(int userId) {
        int unpaidCount = fineDAO.getUnpaidFineCount(userId);
        if (unpaidCount <= 3) {
            userDAO.setSuspensionStatus(userId, false);
        }
    }

    // Called by Background Job (FineScannerListener)
    public void scanAndGenerateFines() {
        List<Booking> activeBookings = bookingDAO.getActiveAndOverdueBookings();
        long now = System.currentTimeMillis();

        for (Booking b : activeBookings) {
            long endMillis = b.getEndDate().getTime();

            // Status transitions from ACTIVE -> OVERDUE
            if ("ACTIVE".equals(b.getStatus()) && now > endMillis) {
                bookingDAO.updateBookingStatus(b.getBookingId(), "OVERDUE");
                // Immediately generate the first fine
                generateFineForBooking(b);
            }
            // If already overdue, checking for additional daily fines logic could be added
            // here
            else if ("OVERDUE".equals(b.getStatus()) && now > endMillis) {
                // Updating existing fine amount based on days elapsed
                updateFineAmount(b, now);
            }
        }
    }

    private void generateFineForBooking(Booking b) {
        Community comm = communityDAO.getCommunityById(b.getCommunityId());
        BigDecimal rate = comm != null && comm.getFineRate() != null ? comm.getFineRate() : new BigDecimal("10.00");

        Fine fine = new Fine();
        fine.setBookingId(b.getBookingId());
        fine.setUserId(b.getBorrowerId());
        fine.setAmount(rate);
        fine.setReason("Overdue return for item ID: " + b.getResourceId());
        // Simple due date 7 days from now
        fine.setDueDate(new Date(System.currentTimeMillis() + (7 * 24 * 60 * 60 * 1000L)));

        fineDAO.createFine(fine);
        bookingDAO.updateBookingFine(b.getBookingId(), rate);

        evaluateUserSuspension(b.getBorrowerId());
    }

    private void updateFineAmount(Booking b, long currentTime) {
        long endMillis = b.getEndDate().getTime();
        long diff = currentTime - endMillis;
        long overdueDays = diff / (24 * 60 * 60 * 1000L);

        if (overdueDays > 0) {
            Community comm = communityDAO.getCommunityById(b.getCommunityId());
            BigDecimal rate = comm != null && comm.getFineRate() != null ? comm.getFineRate() : new BigDecimal("10.00");

            BigDecimal calculatedFine = rate.multiply(new BigDecimal(overdueDays));

            // This is a simplified approach, usually we should update the specific Fine
            // record
            // For now, updating the booking record reference is enough for MVP
            bookingDAO.updateBookingFine(b.getBookingId(), calculatedFine);
        }
    }
}
