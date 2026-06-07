package com.mira.backend.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Patient-facing triage outcome. SAFETY: contains ONLY urgency, pathway, calm
 * instruction, safety-netting and contact numbers. It MUST NEVER carry a
 * diagnosis, cluster name, flag, or any condition terminology.
 */
public class Disposition {

    private String urgencyLevel;
    private String pathwayName;
    private String pathwayAction;
    private String patientMessage;
    private String safetyNetting;
    private Contact primaryContact;
    private List<Contact> nearbyContacts = new ArrayList<>();

    public Disposition() {
    }

    public String getUrgencyLevel() {
        return urgencyLevel;
    }

    public void setUrgencyLevel(String urgencyLevel) {
        this.urgencyLevel = urgencyLevel;
    }

    public String getPathwayName() {
        return pathwayName;
    }

    public void setPathwayName(String pathwayName) {
        this.pathwayName = pathwayName;
    }

    public String getPathwayAction() {
        return pathwayAction;
    }

    public void setPathwayAction(String pathwayAction) {
        this.pathwayAction = pathwayAction;
    }

    public String getPatientMessage() {
        return patientMessage;
    }

    public void setPatientMessage(String patientMessage) {
        this.patientMessage = patientMessage;
    }

    public String getSafetyNetting() {
        return safetyNetting;
    }

    public void setSafetyNetting(String safetyNetting) {
        this.safetyNetting = safetyNetting;
    }

    public Contact getPrimaryContact() {
        return primaryContact;
    }

    public void setPrimaryContact(Contact primaryContact) {
        this.primaryContact = primaryContact;
    }

    public List<Contact> getNearbyContacts() {
        return nearbyContacts;
    }

    public void setNearbyContacts(List<Contact> nearbyContacts) {
        this.nearbyContacts = nearbyContacts == null ? new ArrayList<>() : nearbyContacts;
    }
}
