package com.eurasia.nursery.web;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import jakarta.servlet.http.HttpServletRequest;

public final class RequestUser {

    private RequestUser() {}

    public static UserView require(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        if (!(user instanceof UserView view)) {
            throw new BusinessException("未登录", 401);
        }
        return view;
    }
}
