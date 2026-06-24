package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.RoleView;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private final AdminDashboardMapper adminDashboardMapper;
    private final SysUserMapper sysUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final CategoryMapper categoryMapper;
    private final SkuMapper skuMapper;
    private final CustomerMapper customerMapper;
    private final DailyDataService dailyDataService;
    private final SystemMetricsService systemMetricsService;
    private final UserPresenter userPresenter;
    private final PageAccessService pageAccessService;
    private final SmsAuthService smsAuthService;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            AdminDashboardMapper adminDashboardMapper,
            SysUserMapper sysUserMapper,
            SysRoleMapper sysRoleMapper,
            CategoryMapper categoryMapper,
            SkuMapper skuMapper,
            CustomerMapper customerMapper,
            DailyDataService dailyDataService,
            SystemMetricsService systemMetricsService,
            UserPresenter userPresenter,
            PageAccessService pageAccessService,
            SmsAuthService smsAuthService,
            PasswordEncoder passwordEncoder) {
        this.adminDashboardMapper = adminDashboardMapper;
        this.sysUserMapper = sysUserMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.categoryMapper = categoryMapper;
        this.skuMapper = skuMapper;
        this.customerMapper = customerMapper;
        this.dailyDataService = dailyDataService;
        this.systemMetricsService = systemMetricsService;
        this.userPresenter = userPresenter;
        this.pageAccessService = pageAccessService;
        this.smsAuthService = smsAuthService;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> dashboardKpi() {
        List<Map<String, Object>> roleUsers = new ArrayList<>();
        for (Map<String, Object> r : adminDashboardMapper.listRolesBrief()) {
            Long roleId = ((Number) r.get("id")).longValue();
            roleUsers.add(Map.of(
                    "name", r.get("name"),
                    "value", adminDashboardMapper.countUsersByRole(roleId)
            ));
        }
        List<Map<String, Object>> categorySlices = new ArrayList<>();
        for (Map<String, Object> row : adminDashboardMapper.varietyCounts()) {
            categorySlices.add(Map.of(
                    "name", row.get("variety"),
                    "value", ((Number) row.get("cnt")).intValue()
            ));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userCount", adminDashboardMapper.countUsers());
        out.put("activeToday", adminDashboardMapper.countOnlineUsers());
        out.put("roleCount", roleUsers.size());
        out.put("roleUsers", roleUsers);
        out.put("categoryNodeCount", adminDashboardMapper.countSkus());
        out.put("categorySlices", categorySlices);
        out.put("customerCount", adminDashboardMapper.countCustomers());
        out.put("newCustomersThisWeek", adminDashboardMapper.countNewCustomersThisWeek());
        out.put("systemUptimePercent", 99.9);
        return out;
    }

    public List<Map<String, Object>> listUsers() {
        return sysUserMapper.listAllWithRole().stream().map(userPresenter::mapUserRow).toList();
    }

    public Map<String, Object> createUser(Map<String, Object> body) {
        String username = trim(body.get("username"));
        String password = body.containsKey("password") ? String.valueOf(body.get("password")) : "123456";
        String displayName = trim(body.get("displayName"));
        String phone = smsAuthService.normalizePhone(String.valueOf(body.getOrDefault("phone", "")));
        long roleId = longVal(body.get("roleId"), 3L);

        if (username.length() < 3) {
            throw new BusinessException("用户名至少 3 个字符");
        }
        if (password.length() < 6) {
            throw new BusinessException("密码至少 6 位");
        }
        if (displayName.isEmpty()) {
            throw new BusinessException("请填写姓名");
        }
        if (sysUserMapper.findIdByUsername(username) != null) {
            throw new BusinessException("用户名已存在");
        }
        if (!phone.isEmpty() && sysUserMapper.findByPhone(phone) != null) {
            throw new BusinessException("该手机号已被使用");
        }
        if (sysUserMapper.roleExists(roleId) == null) {
            throw new BusinessException("角色不存在");
        }

        UserView user = new UserView();
        user.setUsername(username);
        user.setDisplayName(displayName);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRoleId(roleId);
        user.setStatus("OFFLINE");
        user.setPhone(phone.isEmpty() ? null : phone);
        sysUserMapper.insert(user);

        UserView created = sysUserMapper.findByUsername(username);
        if (created == null) {
            throw new BusinessException("创建失败", 500);
        }
        return userPresenter.mapUserRow(created);
    }

    public Map<String, Object> updateUser(long id, Map<String, Object> body) {
        UserView existing = sysUserMapper.findById(id);
        if (existing == null) {
            throw new BusinessException("用户不存在");
        }

        String displayName = existing.getDisplayName();
        String status = existing.getStatus();
        Long roleId = existing.getRoleId();
        String phone = existing.getPhone();
        String extraJson = existing.getExtraPageAccess() == null ? "[]" : existing.getExtraPageAccess();
        boolean changed = false;

        if (body.containsKey("displayName") && !trim(body.get("displayName")).isEmpty()) {
            displayName = trim(body.get("displayName"));
            changed = true;
        }
        if (body.containsKey("status")) {
            status = userPresenter.parseStatus(String.valueOf(body.get("status")));
            changed = true;
        }
        if (body.containsKey("roleId")) {
            roleId = longVal(body.get("roleId"), roleId);
            changed = true;
        }
        if (body.containsKey("phone")) {
            phone = smsAuthService.normalizePhone(String.valueOf(body.get("phone")));
            if (!phone.isEmpty()) {
                UserView other = sysUserMapper.findByPhone(phone);
                if (other != null && !other.getId().equals(id)) {
                    throw new BusinessException("该手机号已被使用");
                }
            }
            changed = true;
        }
        if (body.containsKey("extraPages") && body.get("extraPages") instanceof List<?> extraList) {
            String roleCode = sysUserMapper.findRoleCodeByUserId(id);
            if (roleCode == null) {
                throw new BusinessException("用户不存在");
            }
            if ("ADMIN".equals(roleCode)) {
                throw new BusinessException("系统管理员拥有全部页面权限，无需配置");
            }
            List<String> requested = extraList.stream().map(String::valueOf).toList();
            extraJson = userPresenter.encodeExtra(pageAccessService.sanitizeExtraForRole(roleCode, requested));
            changed = true;
        }

        if (changed) {
            sysUserMapper.updateAdminFields(id, displayName, roleId, status,
                    phone == null || phone.isEmpty() ? null : phone, extraJson);
        }
        return getUser(id);
    }

    public void deleteUser(long id, String currentUsername) {
        UserView user = sysUserMapper.findById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (currentUsername.equals(user.getUsername())) {
            throw new BusinessException("不能删除当前登录账号");
        }
        if ("ADMIN".equals(user.getRoleCode()) && sysUserMapper.countAdmins() <= 1) {
            throw new BusinessException("不能删除最后一个系统管理员");
        }
        sysUserMapper.deleteById(id);
    }

    public void resetPassword(long id, Map<String, Object> body) {
        String pwd = String.valueOf(body.getOrDefault("password", ""));
        if (pwd.length() < 6) {
            throw new BusinessException("新密码至少 6 位");
        }
        if (sysUserMapper.updatePassword(id, passwordEncoder.encode(pwd)) == 0) {
            throw new BusinessException("用户不存在");
        }
    }

    public List<Map<String, Object>> listRoles() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (RoleView r : sysRoleMapper.findAllDetailed()) {
            out.add(Map.of(
                    "id", r.getId(),
                    "name", r.getName(),
                    "permissions", r.getPermissions() == null ? "" : r.getPermissions(),
                    "userCount", sysRoleMapper.countUsersByRoleId(r.getId())
            ));
        }
        return out;
    }

    public Map<String, Object> updateRole(long id, Map<String, Object> body) {
        RoleView existing = sysRoleMapper.findDetailedById(id);
        if (existing == null) {
            throw new BusinessException("角色不存在");
        }
        String name = existing.getName();
        String permissions = existing.getPermissions();
        boolean changed = false;
        if (body.containsKey("name") && !trim(body.get("name")).isEmpty()) {
            name = trim(body.get("name"));
            changed = true;
        }
        if (body.containsKey("permissions")) {
            permissions = trim(body.get("permissions"));
            changed = true;
        }
        if (!changed) {
            throw new BusinessException("无更新内容");
        }
        sysRoleMapper.updateRole(id, name, permissions);
        RoleView updated = sysRoleMapper.findDetailedById(id);
        return Map.of(
                "id", updated.getId(),
                "name", updated.getName(),
                "permissions", updated.getPermissions() == null ? "" : updated.getPermissions(),
                "userCount", sysRoleMapper.countUsersByRoleId(id)
        );
    }

    public List<Map<String, Object>> listCategories() {
        return categoryTree(null);
    }

    public Map<String, Object> createCategory(Map<String, Object> body) {
        String name = trim(body.get("name"));
        if (name.isEmpty()) {
            throw new BusinessException("名称不能为空");
        }
        Long parentId = null;
        if (body.get("parentId") != null && !String.valueOf(body.get("parentId")).isBlank()) {
            parentId = longVal(body.get("parentId"), 0);
        }
        int level = body.containsKey("level") ? intVal(body.get("level")) : (parentId != null ? 2 : 1);
        int sortOrder = intVal(body.get("sortOrder"));
        categoryMapper.insert(parentId, name, level, sortOrder);
        Long id = categoryMapper.lastInsertId();
        Map<String, Object> row = categoryMapper.findById(id);
        return Map.of(
                "id", id,
                "name", row.get("name"),
                "level", ((Number) row.get("level")).intValue(),
                "children", List.of()
        );
    }

    public Map<String, Object> updateCategory(long id, Map<String, Object> body) {
        Map<String, Object> row = categoryMapper.findById(id);
        if (row == null) {
            throw new BusinessException("品类不存在");
        }
        if (body.containsKey("name") && !trim(body.get("name")).isEmpty()) {
            categoryMapper.updateName(id, trim(body.get("name")));
        }
        if (body.containsKey("sortOrder")) {
            categoryMapper.updateSortOrder(id, intVal(body.get("sortOrder")));
        }
        row = categoryMapper.findById(id);
        return Map.of(
                "id", id,
                "name", row.get("name"),
                "level", ((Number) row.get("level")).intValue(),
                "children", categoryTree(id)
        );
    }

    public void deleteCategory(long id) {
        if (categoryMapper.countChildren(id) > 0) {
            throw new BusinessException("请先删除子品类");
        }
        categoryMapper.delete(id);
    }

    public List<Map<String, Object>> listSkus() {
        return skuMapper.listAll().stream().map(this::mapSku).toList();
    }

    public Map<String, Object> createSku(Map<String, Object> body) {
        String variety = trim(body.get("variety"));
        String specification = trim(body.get("specification"));
        if (variety.isEmpty() || specification.isEmpty()) {
            throw new BusinessException("品种和规格不能为空");
        }
        if (skuMapper.findDuplicate(variety, specification) != null) {
            throw new BusinessException("该品种规格已存在");
        }
        Long categoryId = parseCategoryId(body.get("categoryId"));
        validateCategoryId(categoryId);
        skuMapper.insert(variety, specification, categoryId);
        return getSku(skuMapper.lastInsertId());
    }

    public Map<String, Object> updateSku(long id, Map<String, Object> body) {
        Map<String, Object> row = skuMapper.findById(id);
        if (row == null) {
            throw new BusinessException("品种规格不存在");
        }
        String variety = body.containsKey("variety") ? trim(body.get("variety")) : String.valueOf(row.get("variety"));
        String specification = body.containsKey("specification")
                ? trim(body.get("specification"))
                : String.valueOf(row.get("specification"));
        if (variety.isEmpty() || specification.isEmpty()) {
            throw new BusinessException("品种和规格不能为空");
        }
        if (skuMapper.findDuplicateExclude(variety, specification, id) != null) {
            throw new BusinessException("该品种规格已存在");
        }
        Long categoryId = body.containsKey("categoryId")
                ? parseCategoryId(body.get("categoryId"))
                : (row.get("categoryId") != null ? ((Number) row.get("categoryId")).longValue() : null);
        validateCategoryId(categoryId);
        skuMapper.update(id, variety, specification, categoryId);
        return getSku(id);
    }

    public void deleteSku(long id) {
        if (skuMapper.findById(id) == null) {
            throw new BusinessException("品种规格不存在");
        }
        if (skuMapper.countStockBySku(id) > 0) {
            throw new BusinessException("该品种规格仍有库存记录，无法删除");
        }
        skuMapper.delete(id);
    }

    public Map<String, Object> skuCatalog() {
        List<Map<String, Object>> rows = skuMapper.catalogRows();
        List<String> varieties = new ArrayList<>();
        Map<String, List<String>> specificationsByVariety = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            String variety = String.valueOf(r.get("variety"));
            String spec = String.valueOf(r.get("specification"));
            if (!varieties.contains(variety)) {
                varieties.add(variety);
            }
            specificationsByVariety.computeIfAbsent(variety, k -> new ArrayList<>()).add(spec);
        }
        return Map.of("varieties", varieties, "specificationsByVariety", specificationsByVariety);
    }

    public List<Map<String, Object>> listCustomers() {
        return customerMapper.listAll().stream().map(this::mapCustomer).toList();
    }

    public Map<String, Object> createCustomer(Map<String, Object> body) {
        String level = normalizeLevel(body.get("level"));
        customerMapper.insert(
                trim(body.get("name")),
                nullableStr(body.get("contactName")),
                nullableStr(body.get("region")),
                emptyToNull(trim(body.get("district"))),
                level,
                nullableStr(body.get("phone"))
        );
        return getCustomer(customerMapper.lastInsertId());
    }

    public Map<String, Object> updateCustomer(long id, Map<String, Object> body) {
        Map<String, Object> existing = customerMapper.findById(id);
        if (existing == null) {
            throw new BusinessException("客户不存在");
        }
        Map<String, Object> row = new LinkedHashMap<>(existing);
        if (body.containsKey("name")) {
            row.put("name", trim(body.get("name")));
        }
        if (body.containsKey("contactName")) {
            row.put("contact_name", nullableStr(body.get("contactName")));
        }
        if (body.containsKey("region")) {
            row.put("region", nullableStr(body.get("region")));
        }
        if (body.containsKey("district")) {
            row.put("district", emptyToNull(trim(body.get("district"))));
        }
        if (body.containsKey("phone")) {
            row.put("phone", nullableStr(body.get("phone")));
        }
        if (body.containsKey("level")) {
            row.put("level", normalizeLevel(body.get("level")));
        }
        customerMapper.updateFull(row);
        return getCustomer(id);
    }

    public void deleteCustomer(long id) {
        customerMapper.delete(id);
    }

    public Map<String, Object> getSystemSettings() {
        return dailyDataService.getSettings();
    }

    public Map<String, Object> updateSystemSettings(Map<String, Object> body) {
        if (!body.containsKey("autoFillEnabled")) {
            throw new BusinessException("缺少 autoFillEnabled");
        }
        boolean enabled = body.get("autoFillEnabled") instanceof Boolean b
                ? b
                : Boolean.parseBoolean(String.valueOf(body.get("autoFillEnabled")));
        return dailyDataService.setAutoFillEnabled(enabled);
    }

    public Map<String, Object> runDailyAutoFill() {
        if (!dailyDataService.isAutoFillEnabled()) {
            throw new BusinessException("自动填数未开启");
        }
        dailyDataService.fillPendingThroughToday();
        return dailyDataService.getSettings();
    }

    public Map<String, Object> getSystemMetrics() {
        return systemMetricsService.collect();
    }

    private Map<String, Object> getUser(long id) {
        UserView user = sysUserMapper.findById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return userPresenter.mapUserRow(user);
    }

    private Map<String, Object> getSku(long id) {
        Map<String, Object> row = skuMapper.findById(id);
        if (row == null) {
            throw new BusinessException("品种规格不存在");
        }
        return mapSku(row);
    }

    private Map<String, Object> getCustomer(long id) {
        Map<String, Object> c = customerMapper.findById(id);
        if (c == null) {
            throw new BusinessException("客户不存在");
        }
        return mapCustomer(c);
    }

    private List<Map<String, Object>> categoryTree(Long parentId) {
        List<Map<String, Object>> rows = parentId == null
                ? categoryMapper.findRoots()
                : categoryMapper.findByParent(parentId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> c : rows) {
            long id = ((Number) c.get("id")).longValue();
            out.add(Map.of(
                    "id", id,
                    "name", c.get("name"),
                    "level", ((Number) c.get("level")).intValue(),
                    "children", categoryTree(id)
            ));
        }
        return out;
    }

    private Map<String, Object> mapSku(Map<String, Object> r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", ((Number) r.get("id")).intValue());
        out.put("variety", r.get("variety"));
        out.put("specification", r.get("specification"));
        out.put("categoryId", r.get("categoryId") != null ? ((Number) r.get("categoryId")).intValue() : null);
        out.put("categoryName", r.get("categoryName"));
        return out;
    }

    private Map<String, Object> mapCustomer(Map<String, Object> c) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", ((Number) c.get("id")).intValue());
        out.put("name", c.get("name"));
        out.put("contactName", c.get("contact_name"));
        out.put("region", c.get("region"));
        out.put("district", c.get("district") == null ? "" : c.get("district"));
        out.put("level", c.get("level"));
        return out;
    }

    private void validateCategoryId(Long categoryId) {
        if (categoryId != null && categoryMapper.categoryExists(categoryId) == null) {
            throw new BusinessException("所属品类不存在");
        }
    }

    private Long parseCategoryId(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        return longVal(value, 0);
    }

    private static String normalizeLevel(Object level) {
        String s = trim(level);
        if (s.isEmpty()) {
            return "B";
        }
        return s.substring(0, 1).toUpperCase();
    }

    private static String trim(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static String nullableStr(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private static String emptyToNull(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    private static long longVal(Object value, long defaultVal) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static int intVal(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }
}
