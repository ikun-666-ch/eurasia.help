package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.config.NurseryProperties;
import com.eurasia.nursery.domain.model.RoleView;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.SysRoleMapper;
import com.eurasia.nursery.mapper.SysUserMapper;
import com.eurasia.nursery.security.PhpCompatibleJwt;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final SysUserMapper sysUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final UserQueryService userQueryService;
    private final PasswordEncoder passwordEncoder;
    private final PhpCompatibleJwt jwt;
    private final NurseryProperties properties;
    private final PageAccessService pageAccessService;
    private final SmsAuthService smsAuthService;
    private final SlideCaptchaService slideCaptchaService;
    private final RegisterAuthService registerAuthService;

    public AuthService(
            SysUserMapper sysUserMapper,
            SysRoleMapper sysRoleMapper,
            UserQueryService userQueryService,
            PasswordEncoder passwordEncoder,
            PhpCompatibleJwt jwt,
            NurseryProperties properties,
            PageAccessService pageAccessService,
            SmsAuthService smsAuthService,
            SlideCaptchaService slideCaptchaService,
            RegisterAuthService registerAuthService) {
        this.sysUserMapper = sysUserMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.userQueryService = userQueryService;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.properties = properties;
        this.pageAccessService = pageAccessService;
        this.smsAuthService = smsAuthService;
        this.slideCaptchaService = slideCaptchaService;
        this.registerAuthService = registerAuthService;
    }

    public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "nursery-api");
    }

    public Map<String, Object> login(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new BusinessException("请填写用户名和密码");
        }
        UserView user = userQueryService.findByUsername(username.trim());
        if (user == null) {
            String phone = smsAuthService.normalizePhone(username);
            if (!phone.isEmpty()) {
                user = userQueryService.findByPhone(phone);
            }
        }
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("用户名或密码错误");
        }
        if ("DISABLED".equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        return issueLoginForUser(user, true);
    }

    public Map<String, String> loginMasks() {
        return smsAuthService.loginMasks();
    }

    public void sendSmsCode(String mobile) {
        String phone = smsAuthService.normalizePhone(mobile);
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (!smsAuthService.isAllowedPhone(phone)) {
            throw new BusinessException("该手机号未授权登录");
        }
        String code = smsAuthService.randomCode();
        smsAuthService.setSmsCode(phone, code, "login");
        IhuyiSmsClient.SendResult result = smsAuthService.sendViaIhuyi(phone, code);
        if (!result.ok()) {
            throw new BusinessException(result.message(), 500);
        }
    }

    public Map<String, Object> loginSms(String mobile, String code) {
        String phone = smsAuthService.normalizePhone(mobile);
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (code == null || code.isBlank()) {
            throw new BusinessException("请输入验证码");
        }
        if (!smsAuthService.verifySmsCode(phone, code, "login")) {
            throw new BusinessException("验证码错误或已过期", 401);
        }
        if (!smsAuthService.isAllowedPhone(phone)) {
            throw new BusinessException("该手机号未授权登录", 403);
        }
        String username = smsAuthService.usernameForPhone(phone);
        if (username == null) {
            throw new BusinessException("未配置该手机号对应的系统账号", 500);
        }
        UserView user = userQueryService.findByUsername(username);
        if (user == null) {
            throw new BusinessException("系统账号不存在：" + username, 500);
        }
        return issueLoginForUser(user, true);
    }

    public Map<String, Object> initSlideCaptcha() {
        return slideCaptchaService.init();
    }

    public Map<String, Object> verifySlideCaptcha(String token, int elapsedMs, int trackWidth, int slideDistance) {
        if (token == null || token.isBlank()) {
            throw new BusinessException("验证已失效，请重试");
        }
        Map<String, Object> result = slideCaptchaService.verify(token, elapsedMs, trackWidth, slideDistance);
        if (result == null) {
            throw new BusinessException("滑动验证未通过，请重试");
        }
        return result;
    }

    public void sendRegisterCode(Map<String, Object> body) {
        consumeSlideCaptcha(body);
        String phone = smsAuthService.normalizePhone(String.valueOf(body.getOrDefault("mobile", "")));
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (userQueryService.findByPhone(phone) != null) {
            throw new BusinessException("该手机号已注册");
        }
        smsAuthService.checkSendCooldownOrThrow(phone, "register");
        String code = smsAuthService.randomCode();
        smsAuthService.setSmsCode(phone, code, "register");
        IhuyiSmsClient.SendResult result = smsAuthService.sendViaIhuyi(phone, code);
        if (!result.ok()) {
            throw new BusinessException(result.message(), 500);
        }
    }

    public List<RoleView> listRegisterRoles() {
        return sysRoleMapper.findAll().stream()
                .filter(r -> registerAuthService.allowedRoleCodes().contains(r.getCode()))
                .toList();
    }

    public void sendForgotPasswordCode(Map<String, Object> body) {
        consumeSlideCaptcha(body);
        String phone = smsAuthService.normalizePhone(String.valueOf(body.getOrDefault("mobile", "")));
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (userQueryService.findByPhone(phone) == null) {
            throw new BusinessException("该手机号未注册");
        }
        smsAuthService.checkSendCooldownOrThrow(phone, "reset_password");
        String code = smsAuthService.randomCode();
        smsAuthService.setSmsCode(phone, code, "reset_password");
        IhuyiSmsClient.SendResult result = smsAuthService.sendViaIhuyi(phone, code);
        if (!result.ok()) {
            throw new BusinessException(result.message(), 500);
        }
    }

    public void resetForgotPassword(String mobile, String code, String password) {
        String phone = smsAuthService.normalizePhone(mobile);
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (code == null || code.isBlank()) {
            throw new BusinessException("请输入验证码");
        }
        if (password == null || password.length() < 6) {
            throw new BusinessException("密码至少 6 位");
        }
        if (!smsAuthService.verifySmsCode(phone, code, "reset_password")) {
            throw new BusinessException("验证码错误或已过期", 401);
        }
        UserView user = userQueryService.findByPhone(phone);
        if (user == null) {
            throw new BusinessException("该手机号未注册");
        }
        sysUserMapper.updatePassword(user.getId(), passwordEncoder.encode(password));
    }

    public Map<String, Object> register(Map<String, Object> body) {
        String phone = smsAuthService.normalizePhone(String.valueOf(body.getOrDefault("mobile", "")));
        String code = String.valueOf(body.getOrDefault("code", "")).trim();
        String password = String.valueOf(body.getOrDefault("password", ""));
        String displayName = String.valueOf(body.getOrDefault("displayName", "")).trim();

        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (code.isEmpty()) {
            throw new BusinessException("请输入验证码");
        }
        if (password.length() < 6) {
            throw new BusinessException("密码至少 6 位");
        }
        if (!smsAuthService.verifySmsCode(phone, code, "register")) {
            throw new BusinessException("验证码错误或已过期", 401);
        }
        if (userQueryService.findByPhone(phone) != null) {
            throw new BusinessException("该手机号已注册");
        }

        String username = String.valueOf(body.getOrDefault("username", "")).trim();
        if (username.isEmpty()) {
            username = phone;
        }
        if (username.length() < 3) {
            throw new BusinessException("用户名至少 3 个字符");
        }
        if (sysUserMapper.findIdByUsername(username) != null) {
            throw new BusinessException("用户名已存在");
        }
        if (displayName.isEmpty()) {
            displayName = "用户" + phone.substring(phone.length() - 4);
        }

        String roleCode = String.valueOf(body.getOrDefault("roleCode", "")).trim().toUpperCase();
        if (roleCode.isEmpty()) {
            throw new BusinessException("请选择身份");
        }
        if (!registerAuthService.allowedRoleCodes().contains(roleCode)) {
            throw new BusinessException("请选择有效的身份");
        }
        if ("ADMIN".equals(roleCode)) {
            String adminKey = String.valueOf(body.getOrDefault("adminKey", "")).trim();
            if (!registerAuthService.verifyAdminRegisterKey(adminKey)) {
                throw new BusinessException("管理员密钥不正确");
            }
        }

        Long roleId = sysRoleMapper.findIdByCode(roleCode);
        if (roleId == null) {
            throw new BusinessException("身份配置异常", 500);
        }

        UserView created = new UserView();
        created.setUsername(username);
        created.setDisplayName(displayName);
        created.setPasswordHash(passwordEncoder.encode(password));
        created.setRoleId(roleId);
        created.setStatus("OFFLINE");
        created.setPhone(phone);
        sysUserMapper.insert(created);

        UserView user = userQueryService.findByUsername(username);
        if (user == null) {
            throw new BusinessException("注册失败，请稍后重试", 500);
        }
        return issueLoginForUser(user, true);
    }

    public Map<String, Object> authMe(UserView current) {
        if (!"DISABLED".equals(current.getStatus())) {
            sysUserMapper.touchOnline(current.getId());
            current = userQueryService.findById(current.getId());
        }
        return profilePayload(current);
    }

    public Map<String, Object> updateProfile(UserView current, Map<String, Object> body) {
        boolean usernameChanged = false;
        String newUsername = current.getUsername();
        boolean hasDisplay = body.containsKey("displayName");
        boolean hasUsername = body.containsKey("username");

        if (hasDisplay) {
            String displayName = String.valueOf(body.get("displayName")).trim();
            if (displayName.isEmpty()) {
                throw new BusinessException("姓名不能为空");
            }
            sysUserMapper.updateDisplayName(current.getId(), displayName);
        }
        if (hasUsername) {
            String username = String.valueOf(body.get("username")).trim();
            if (username.length() < 3) {
                throw new BusinessException("用户名至少 3 个字符");
            }
            if (!username.equals(current.getUsername())) {
                if (sysUserMapper.findOtherByUsername(username, current.getId()) != null) {
                    throw new BusinessException("用户名已存在");
                }
                sysUserMapper.updateUsername(current.getId(), username);
                usernameChanged = true;
                newUsername = username;
            }
        }
        if (!hasDisplay && !hasUsername) {
            throw new BusinessException("没有可更新的内容");
        }

        UserView updated = userQueryService.findById(current.getId());
        if (updated == null) {
            throw new BusinessException("更新失败", 500);
        }
        Map<String, Object> payload = profilePayload(updated);
        if (usernameChanged) {
            payload.put("token", jwt.encode(newUsername, updated.getRoleCode(), properties.getJwt().getTtlSeconds()));
        }
        return payload;
    }

    public void changePassword(UserView current, String oldPassword, String newPassword) {
        if (oldPassword == null || oldPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new BusinessException("请填写原密码和新密码");
        }
        if (newPassword.length() < 6) {
            throw new BusinessException("新密码至少 6 位");
        }
        if (!passwordEncoder.matches(oldPassword, current.getPasswordHash())) {
            throw new BusinessException("原密码不正确", 401);
        }
        sysUserMapper.updatePassword(current.getId(), passwordEncoder.encode(newPassword));
    }

    public void sendChangePhoneCode(UserView current, Map<String, Object> body) {
        consumeSlideCaptcha(body);
        String phone = smsAuthService.normalizePhone(String.valueOf(body.getOrDefault("mobile", "")));
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        String currentPhone = smsAuthService.normalizePhone(current.getPhone());
        if (phone.equals(currentPhone)) {
            throw new BusinessException("新手机号不能与当前相同");
        }
        UserView existing = userQueryService.findByPhone(phone);
        if (existing != null && !existing.getId().equals(current.getId())) {
            throw new BusinessException("该手机号已被使用");
        }
        smsAuthService.checkSendCooldownOrThrow(phone, "change_phone");
        String code = smsAuthService.randomCode();
        smsAuthService.setSmsCode(phone, code, "change_phone");
        IhuyiSmsClient.SendResult result = smsAuthService.sendViaIhuyi(phone, code);
        if (!result.ok()) {
            throw new BusinessException(result.message(), 500);
        }
    }

    public Map<String, Object> changePhone(UserView current, String mobile, String code, String password) {
        String phone = smsAuthService.normalizePhone(mobile);
        if (phone.isEmpty()) {
            throw new BusinessException("手机号格式不正确");
        }
        if (code == null || code.isBlank()) {
            throw new BusinessException("请输入验证码");
        }
        if (password == null || password.isBlank()) {
            throw new BusinessException("请输入登录密码");
        }
        if (!passwordEncoder.matches(password, current.getPasswordHash())) {
            throw new BusinessException("密码不正确", 401);
        }
        if (!smsAuthService.verifySmsCode(phone, code, "change_phone")) {
            throw new BusinessException("验证码错误或已过期", 401);
        }
        UserView existing = userQueryService.findByPhone(phone);
        if (existing != null && !existing.getId().equals(current.getId())) {
            throw new BusinessException("该手机号已被使用");
        }
        sysUserMapper.updatePhone(current.getId(), phone);
        UserView updated = userQueryService.findById(current.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("username", updated.getUsername());
        out.put("displayName", updated.getDisplayName());
        out.put("phone", phone);
        out.put("phoneMasked", maskPhone(phone));
        out.put("roleCode", updated.getRoleCode());
        out.put("roleName", updated.getRoleName());
        return out;
    }

    public void logout(UserView current) {
        sysUserMapper.markOffline(current.getId());
    }

    private Map<String, Object> issueLoginForUser(UserView user, boolean updateLastLogin) {
        if ("DISABLED".equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        if (updateLastLogin) {
            sysUserMapper.touchOnlineWithLogin(user.getId());
        } else {
            sysUserMapper.touchOnline(user.getId());
        }
        user = userQueryService.findById(user.getId());
        String token = jwt.encode(user.getUsername(), user.getRoleCode(), properties.getJwt().getTtlSeconds());
        Map<String, Object> payload = loginPayload(user);
        payload.put("token", token);
        return payload;
    }

    private Map<String, Object> loginPayload(UserView user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", user.getUsername());
        payload.put("displayName", user.getDisplayName());
        payload.put("roleCode", user.getRoleCode());
        payload.put("roleName", user.getRoleName());
        payload.put("defaultPages", pageAccessService.roleDefaults(user.getRoleCode()));
        payload.put("extraPages", pageAccessService.parseExtra(user.getExtraPageAccess()));
        payload.put("pageAccess", pageAccessService.resolve(user.getRoleCode(), user.getExtraPageAccess()));
        return payload;
    }

    private Map<String, Object> profilePayload(UserView user) {
        Map<String, Object> payload = loginPayload(user);
        String phone = user.getPhone() == null ? "" : user.getPhone();
        payload.put("phone", phone);
        payload.put("phoneMasked", phone.isEmpty() ? "" : maskPhone(phone));
        return payload;
    }

    private String maskPhone(String phone) {
        phone = smsAuthService.normalizePhone(phone);
        if (phone.length() != 11) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }

    private void consumeSlideCaptcha(Map<String, Object> body) {
        String token = String.valueOf(body.getOrDefault("captchaToken", "")).trim();
        if (!slideCaptchaService.consume(token)) {
            throw new BusinessException("请先完成滑动验证", 403);
        }
    }
}
