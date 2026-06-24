package com.eurasia.nursery.security;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.UserQueryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+(\\S+)$", Pattern.CASE_INSENSITIVE);

    private static final List<String> PUBLIC_PATHS = List.of(
            "/health",
            "/auth/login",
            "/auth/register",
            "/auth/register/roles",
            "/auth/register/send-code",
            "/auth/captcha/slide/init",
            "/auth/captcha/slide/verify",
            "/auth/forgot-password/send-code",
            "/auth/forgot-password/reset",
            "/auth/login-masks",
            "/auth/sms/send",
            "/auth/sms/login"
    );

    private final PhpCompatibleJwt jwt;
    private final UserQueryService userQueryService;
    private final ObjectMapper objectMapper;

    public JwtAuthFilter(PhpCompatibleJwt jwt, UserQueryService userQueryService, ObjectMapper objectMapper) {
        this.jwt = jwt;
        this.userQueryService = userQueryService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && path.startsWith(context)) {
            path = path.substring(context.length());
        }
        if (path.isEmpty()) {
            path = "/";
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || PUBLIC_PATHS.contains(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth == null) {
            writeFail(response, 401, "未登录");
            return;
        }
        Matcher m = BEARER.matcher(auth);
        if (!m.find()) {
            writeFail(response, 401, "未登录");
            return;
        }
        Map<String, Object> payload = jwt.decode(m.group(1));
        if (payload == null) {
            writeFail(response, 401, "登录已过期");
            return;
        }
        String username = String.valueOf(payload.get("sub"));
        UserView user = userQueryService.findByUsername(username);
        if (user == null) {
            writeFail(response, 401, "用户不存在");
            return;
        }
        request.setAttribute("currentUser", user);
        filterChain.doFilter(request, response);
    }

    private void writeFail(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.fail(message));
    }
}
