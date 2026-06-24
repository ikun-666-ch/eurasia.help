package com.eurasia.nursery.web;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Arrays;
import java.util.List;

public final class RoleAuth {

    private RoleAuth() {}

    public static UserView requireRoles(HttpServletRequest request, String... roles) {
        UserView user = RequestUser.require(request);
        List<String> allowed = Arrays.asList(roles);
        if (!allowed.contains(user.getRoleCode())) {
            throw new BusinessException("权限不足", 403);
        }
        return user;
    }
}
