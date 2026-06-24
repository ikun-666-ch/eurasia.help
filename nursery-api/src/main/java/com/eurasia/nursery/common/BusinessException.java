package com.eurasia.nursery.common;

public class BusinessException extends RuntimeException {

    private final int httpStatus;

    public BusinessException(String message) {
        this(message, 400);
    }

    public BusinessException(String message, int httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
