package com.eurasia.nursery.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(int code, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(0, message, data);
    }

    public static ApiResponse<Void> okMessage(String message) {
        return new ApiResponse<>(0, message, null);
    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(-1, message, null);
    }
}
