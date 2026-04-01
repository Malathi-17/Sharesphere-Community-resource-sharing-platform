package com.sharespeare.service;

import com.sharespeare.dao.BookingDAO;
import com.sharespeare.dao.CommunityDAO;
import com.sharespeare.dao.ResourceDAO;
import com.sharespeare.model.Booking;
import com.sharespeare.model.Community;

import java.sql.Date;
import java.util.List;

public class BookingService {

    private final BookingDAO bookingDAO;
    private final ResourceDAO resourceDAO;
    private final CommunityDAO communityDAO;

    public BookingService() {
        this.bookingDAO = new BookingDAO();
        this.resourceDAO = new ResourceDAO();
        this.communityDAO = new CommunityDAO();
    }

    public Booking requestBooking(int resourceId, int borrowerId, int communityId, Date startDate, Date endDate)
            throws Exception {

        // 1. Validate community membership
        String role = communityDAO.getUserRoleInCommunity(communityId, borrowerId);
        if (role == null) {
            throw new Exception("You must join the community to borrow resources.");
        }

        // 2. Validate Borrow Limit (Prevent user from borrowing > 3 active items at a
        // time)
        Community comm = communityDAO.getCommunityById(communityId);
        long activeBookingsCount = bookingDAO.getBookingsByUser(borrowerId).stream()
                .filter(b -> b.getCommunityId() == communityId &&
                        ("ACTIVE".equals(b.getStatus()) || "REQUESTED".equals(b.getStatus())
                                || "OVERDUE".equals(b.getStatus())))
                .count();

        if (activeBookingsCount >= comm.getBorrowLimit()) {
            throw new Exception(
                    "You have reached the borrow limit (" + comm.getBorrowLimit() + ") for this community.");
        }

        // 3. Date Overlap Validation
        if (!bookingDAO.isResourceAvailableForDates(resourceId, startDate, endDate)) {
            throw new Exception("The resource is already booked for the selected dates. You can join the waitlist.");
        }

        // 4. Create the request
        Booking booking = new Booking();
        booking.setResourceId(resourceId);
        booking.setBorrowerId(borrowerId);
        booking.setCommunityId(communityId);
        booking.setStartDate(startDate);
        booking.setEndDate(endDate);

        return bookingDAO.createBooking(booking);
    }

    public void approveBooking(int bookingId, int requesterId) throws Exception {
        Booking booking = bookingDAO.getBookingById(bookingId);
        if (booking == null)
            throw new Exception("Booking not found");

        // Only owner or admin can approve
        String role = communityDAO.getUserRoleInCommunity(booking.getCommunityId(), requesterId);
        if (booking.getOwnerId() != requesterId && !"ADMIN".equals(role)) {
            throw new Exception("Unauthorized to approve this booking.");
        }

        // Decrement available quantity of the resource
        boolean qtDecremented = resourceDAO.decrementAvailableQuantity(booking.getResourceId());
        if (!qtDecremented) {
            throw new Exception("Resource is no longer available.");
        }

        bookingDAO.updateBookingStatus(bookingId, "ACTIVE");
    }

    public void rejectBooking(int bookingId, int requesterId) throws Exception {
        Booking booking = bookingDAO.getBookingById(bookingId);
        if (booking == null)
            throw new Exception("Booking not found");

        String role = communityDAO.getUserRoleInCommunity(booking.getCommunityId(), requesterId);
        if (booking.getOwnerId() != requesterId && !"ADMIN".equals(role)) {
            throw new Exception("Unauthorized to reject this booking.");
        }

        bookingDAO.updateBookingStatus(bookingId, "REJECTED");
    }

    public void returnResource(int bookingId, int borrowerId) throws Exception {
        Booking booking = bookingDAO.getBookingById(bookingId);
        if (booking == null)
            throw new Exception("Booking not found");

        if (booking.getBorrowerId() != borrowerId) {
            throw new Exception("Unauthorized. You are not the borrower of this item.");
        }

        // Important: Lifecycle transition
        bookingDAO.updateBookingStatus(bookingId, "RETURNED");

        // Increment resource quantity back
        resourceDAO.incrementAvailableQuantity(booking.getResourceId());
    }

    public void extendBooking(int bookingId, int borrowerId, int additionalDays) throws Exception {
        Booking booking = bookingDAO.getBookingById(bookingId);
        if (booking == null)
            throw new Exception("Booking not found");

        if (booking.getBorrowerId() != borrowerId) {
            throw new Exception("Unauthorized to extend this booking.");
        }

        long millisInDay = 24 * 60 * 60 * 1000L;
        Date newEndDate = new Date(booking.getEndDate().getTime() + (additionalDays * millisInDay));

        // Validate date conflict for the *new* extension period only
        // Ideally we'd have a more robust overlap check here excluding current booking
        if (!bookingDAO.isResourceAvailableForDates(booking.getResourceId(), booking.getEndDate(), newEndDate)) {
            throw new Exception("Cannot extend. The resource is booked by someone else during this new period.");
        }

        bookingDAO.extendBooking(bookingId, newEndDate);
    }

    public List<Booking> getUserBookings(int userId) {
        return bookingDAO.getBookingsByUser(userId);
    }

    public List<Booking> getCommunityBookings(int communityId) {
        return bookingDAO.getBookingsByCommunity(communityId);
    }

    public List<Booking> getActiveAndOverdueBookings() {
        return bookingDAO.getActiveAndOverdueBookings();
    }
}
