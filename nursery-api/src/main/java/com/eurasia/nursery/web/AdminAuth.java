package com.eurasia.nursery.web;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.security.PhpCompatibleJwt;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AdminAuth {

    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+(\\S+)$", Pattern.CASE_INSENSITIVE);

    private final PhpCompatibleJwt jwt;

    public AdminAuth(PhpCompatibleJwt jwt) {
        this.jwt = jwt;
    }

    public void requireAdmin(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth == null) {
            throw new BusinessException("未登录", 401);
        }
        Matcher m = BEARER.matcher(auth);
        if (!m.find()) {
            throw new BusinessException("未登录", 401);
        }
        Map<String, Object> payload = jwt.decode(m.group(1));
        if (payload == null) {
            throw new BusinessException("登录已过期", 401);
        }
        if (!"ADMIN".equals(String.valueOf(payload.get("role")))) {
            throw new BusinessException("需要系统管理员权限", 403);
        }
    }

    public UserView requireAdminUser(HttpServletRequest request) {
        requireAdmin(request);
        return RequestUser.require(request);
    }
}
