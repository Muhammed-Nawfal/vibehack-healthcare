package com.mira.backend.store;

import com.mira.backend.model.TriageSession;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory session store for the prototype (no database). Thread-safe so
 * concurrent requests during a demo don't clash.
 */
@Component
public class SessionStore {

    private final ConcurrentHashMap<String, TriageSession> sessions = new ConcurrentHashMap<>();

    public void save(TriageSession session) {
        sessions.put(session.getSessionId(), session);
    }

    public Optional<TriageSession> find(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }
}
