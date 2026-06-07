package com.mira.backend.dto;

/**
 * A single answered question. {@code answer} is the machine value of the chosen
 * option (e.g. "less_than_usual", "yes"), matching the frontend question flow.
 */
public class AnswerEntry {

    private String questionId;
    private String answer;

    public AnswerEntry() {
    }

    public AnswerEntry(String questionId, String answer) {
        this.questionId = questionId;
        this.answer = answer;
    }

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
