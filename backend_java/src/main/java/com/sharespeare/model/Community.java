package com.sharespeare.model;

import java.sql.Timestamp;
import java.math.BigDecimal;

public class Community {
    private int communityId;
    private String communityName;
    private String communityType;
    private int createdBy;
    private Timestamp createdAt;
    private String description;
    private BigDecimal fineRate;
    private int borrowLimit;
    private boolean joinApproval;

    public Community() {}

    public int getCommunityId() { return communityId; }
    public void setCommunityId(int communityId) { this.communityId = communityId; }

    public String getCommunityName() { return communityName; }
    public void setCommunityName(String communityName) { this.communityName = communityName; }

    public String getCommunityType() { return communityType; }
    public void setCommunityType(String communityType) { this.communityType = communityType; }

    public int getCreatedBy() { return createdBy; }
    public void setCreatedBy(int createdBy) { this.createdBy = createdBy; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getFineRate() { return fineRate; }
    public void setFineRate(BigDecimal fineRate) { this.fineRate = fineRate; }

    public int getBorrowLimit() { return borrowLimit; }
    public void setBorrowLimit(int borrowLimit) { this.borrowLimit = borrowLimit; }

    public boolean isJoinApproval() { return joinApproval; }
    public void setJoinApproval(boolean joinApproval) { this.joinApproval = joinApproval; }
}
