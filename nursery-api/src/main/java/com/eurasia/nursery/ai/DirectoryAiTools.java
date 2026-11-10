package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.AdminService;
import com.eurasia.nursery.service.SalesService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class DirectoryAiTools {

    private final AdminService adminService;
    private final SalesService salesService;
    private final ObjectMapper objectMapper;
    private final AiAccess access;
    private final AiWrites writes;

    public DirectoryAiTools(AdminService adminService, SalesService salesService, ObjectMapper objectMapper,
                            AiAccess access, AiWrites writes) {
        this.adminService = adminService;
        this.salesService = salesService;
        this.objectMapper = objectMapper;
        this.access = access;
        this.writes = writes;
    }

    public List<AiTool> tools() {
        return List.of(users(), roles(), categories(), skus(), customers());
    }

    private AiTool users() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action",
                "list 查询；create 创建；update 修改姓名、状态、角色、手机、额外页面；delete 删除；reset_password 重置密码。只有用户明确要求时才删除或改密码。",
                "list", "create", "update", "delete", "reset_password");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "用户 id");
        AiSchemas.prop(objectMapper, schema, "username", "string", "用户名");
        AiSchemas.prop(objectMapper, schema, "password", "string", "密码，至少 6 位。不要在回复里复述密码");
        AiSchemas.prop(objectMapper, schema, "displayName", "string", "姓名");
        AiSchemas.prop(objectMapper, schema, "phone", "string", "手机号");
        AiSchemas.prop(objectMapper, schema, "roleId", "integer", "角色 id");
        AiSchemas.prop(objectMapper, schema, "status", "string", "在线、离线或禁用");
        AiSchemas.arrayProp(objectMapper, schema, "extraPages", "额外页面，如 sal、inv、fin、orders");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("users", "用户账号。删除和重置密码必须是用户明确提出的。回复里不要出现密码。", schema, Map.of(
                "list", "查询用户",
                "create", "创建用户",
                "update", "更新用户",
                "delete", "删除用户",
                "reset_password", "重置用户密码"
        ), this::usersHandle);
    }

    private AiTool roles() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "list 查询；update 修改名称或权限描述", "list", "update");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "角色 id");
        AiSchemas.prop(objectMapper, schema, "name", "string", "角色名称");
        AiSchemas.prop(objectMapper, schema, "permissions", "string", "权限描述");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("roles", "角色。update 需要 id，以及 name 或 permissions。", schema, Map.of(
                "list", "查询角色",
                "update", "更新角色"
        ), this::rolesHandle);
    }

    private AiTool categories() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "list、create、update、delete", "list", "create", "update", "delete");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "品类 id");
        AiSchemas.prop(objectMapper, schema, "name", "string", "名称");
        AiSchemas.prop(objectMapper, schema, "parentId", "integer", "父品类 id");
        AiSchemas.prop(objectMapper, schema, "level", "integer", "层级");
        AiSchemas.prop(objectMapper, schema, "sortOrder", "integer", "排序");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("categories", "苗木品类。有子品类时不能删除。", schema, Map.of(
                "list", "查询品类",
                "create", "创建品类",
                "update", "更新品类",
                "delete", "删除品类"
        ), this::categoriesHandle);
    }

    private AiTool skus() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "list、create、update、delete", "list", "create", "update", "delete");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "SKU id");
        AiSchemas.prop(objectMapper, schema, "variety", "string", "品种");
        AiSchemas.prop(objectMapper, schema, "specification", "string", "规格");
        AiSchemas.prop(objectMapper, schema, "categoryId", "integer", "所属品类 id");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("skus", "品种规格。仍有库存时不能删除。", schema, Map.of(
                "list", "查询品种规格",
                "create", "创建品种规格",
                "update", "更新品种规格",
                "delete", "删除品种规格"
        ), this::skusHandle);
    }

    private AiTool customers() {
        ObjectNode schema = AiSchemas.object(objectMapper);
        AiSchemas.enumProp(objectMapper, schema, "action", "list、create、update、delete", "list", "create", "update", "delete");
        AiSchemas.prop(objectMapper, schema, "id", "integer", "客户 id");
        AiSchemas.prop(objectMapper, schema, "name", "string", "客户名称");
        AiSchemas.prop(objectMapper, schema, "contactName", "string", "联系人");
        AiSchemas.prop(objectMapper, schema, "region", "string", "地市");
        AiSchemas.prop(objectMapper, schema, "district", "string", "区县");
        AiSchemas.prop(objectMapper, schema, "phone", "string", "电话");
        AiSchemas.prop(objectMapper, schema, "level", "string", "等级，如 A/B/C");
        AiSchemas.require(objectMapper, schema, "action");
        return new AiTool("customers", "客户档案。", schema, Map.of(
                "list", "查询客户",
                "create", "创建客户",
                "update", "更新客户",
                "delete", "删除客户"
        ), this::customersHandle);
    }

    private Object usersHandle(UserView caller, JsonNode args) {
        access.requireAdmin(caller);
        return switch (AiArgs.action(args)) {
            case "list" -> AiResults.listed(filterUsers(args));
            case "create" -> {
                Map<String, Object> body = AiArgs.pick(objectMapper, args, "username", "password", "displayName", "phone", "roleId");
                String summary = "创建用户 " + body.get("username") + "（" + body.get("displayName") + "）";
                yield writes.run(caller, "users", "create", summary, null, false, false,
                        () -> adminService.createUser(body));
            }
            case "update" -> updateUser(caller, args);
            case "delete" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findUser(id);
                String summary = "删除用户 " + before.get("username") + "（id " + id + "）";
                yield writes.run(caller, "users", "delete", summary, before, true, false, () -> {
                    adminService.deleteUser(id, caller.getUsername() == null ? "" : caller.getUsername());
                    return AiResults.deleted(id);
                });
            }
            case "reset_password" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findUser(id);
                String summary = "重置用户 " + before.get("username") + " 的登录密码";
                yield writes.run(caller, "users", "reset_password", summary, null, true, false, () -> {
                    adminService.resetPassword(id, AiArgs.pick(objectMapper, args, "password"));
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("ok", true);
                    out.put("userId", id);
                    out.put("message", "密码已重置");
                    return out;
                });
            }
            default -> AiResults.unknownAction("list", "create", "update", "delete", "reset_password");
        };
    }

    private Object updateUser(UserView caller, JsonNode args) {
        long id = AiArgs.requiredLong(args, "id");
        Map<String, Object> before = findUser(id);
        Map<String, Object> body = AiArgs.pick(objectMapper, args, "displayName", "status", "roleId", "phone", "extraPages");
        boolean sensitive = body.containsKey("roleId") || body.containsKey("status") || body.containsKey("extraPages");
        boolean reversible = !body.containsKey("extraPages");
        String summary = "修改用户 " + before.get("username") + "：" + body.keySet();
        return writes.run(caller, "users", "update", summary, before, sensitive, reversible,
                () -> adminService.updateUser(id, body));
    }

    private Map<String, Object> findUser(long id) {
        for (Map<String, Object> row : adminService.listUsers()) {
            Object value = row.get("id");
            long rowId = value instanceof Number number ? number.longValue() : 0;
            if (rowId == id) {
                return row;
            }
        }
        throw new com.eurasia.nursery.common.BusinessException("用户不存在");
    }

    private List<Map<String, Object>> filterUsers(JsonNode args) {
        List<Map<String, Object>> rows = new ArrayList<>(adminService.listUsers());
        String username = AiArgs.text(args, "username");
        String displayName = AiArgs.text(args, "displayName");
        if (!username.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("username"), username)).toList();
        }
        if (!displayName.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("displayName"), displayName)).toList();
        }
        return rows;
    }

    private Object rolesHandle(UserView caller, JsonNode args) {
        access.requireAdmin(caller);
        return switch (AiArgs.action(args)) {
            case "list" -> AiResults.listed(adminService.listRoles());
            case "update" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findRole(id);
                Map<String, Object> body = AiArgs.pick(objectMapper, args, "name", "permissions");
                String summary = "修改角色 " + before.get("name") + "（id " + id + "）";
                yield writes.run(caller, "roles", "update", summary, before, true, true,
                        () -> adminService.updateRole(id, body));
            }
            default -> AiResults.unknownAction("list", "update");
        };
    }

    private Map<String, Object> findRole(long id) {
        for (Map<String, Object> row : adminService.listRoles()) {
            Object value = row.get("id");
            long rowId = value instanceof Number number ? number.longValue() : 0;
            if (rowId == id) {
                return new LinkedHashMap<>(row);
            }
        }
        throw new com.eurasia.nursery.common.BusinessException("角色不存在");
    }

    private Object categoriesHandle(UserView caller, JsonNode args) {
        access.requireAdmin(caller);
        return switch (AiArgs.action(args)) {
            case "list" -> adminService.listCategories();
            case "create" -> writes.run(caller, "categories", "create", "创建品类 " + AiArgs.text(args, "name"), null, false, true,
                    () -> adminService.createCategory(AiArgs.pick(objectMapper, args, "name", "parentId", "level", "sortOrder")));
            case "update" -> {
                long id = AiArgs.requiredLong(args, "id");
                yield writes.run(caller, "categories", "update", "修改品类 " + id, Map.of("id", id, "name", AiArgs.text(args, "name")),
                        false, false, () -> adminService.updateCategory(id, AiArgs.pick(objectMapper, args, "name", "sortOrder")));
            }
            case "delete" -> {
                long id = AiArgs.requiredLong(args, "id");
                String summary = "删除品类 " + id;
                yield writes.run(caller, "categories", "delete", summary, Map.of("id", id), true, false, () -> {
                    adminService.deleteCategory(id);
                    return AiResults.deleted(id);
                });
            }
            default -> AiResults.unknownAction("list", "create", "update", "delete");
        };
    }

    private Object skusHandle(UserView caller, JsonNode args) {
        access.requireAdmin(caller);
        return switch (AiArgs.action(args)) {
            case "list" -> AiResults.listed(filterSkus(args));
            case "create" -> writes.run(caller, "skus", "create",
                    "创建品种规格 " + AiArgs.text(args, "variety") + " " + AiArgs.text(args, "specification"), null, false, true,
                    () -> adminService.createSku(AiArgs.pick(objectMapper, args, "variety", "specification", "categoryId")));
            case "update" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findSku(id);
                yield writes.run(caller, "skus", "update", "修改品种规格 " + id, before, false, true,
                        () -> adminService.updateSku(id, AiArgs.pick(objectMapper, args, "variety", "specification", "categoryId")));
            }
            case "delete" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findSku(id);
                String summary = "删除品种规格 " + before.get("variety") + " " + before.get("specification");
                yield writes.run(caller, "skus", "delete", summary, before, true, false, () -> {
                    adminService.deleteSku(id);
                    return AiResults.deleted(id);
                });
            }
            default -> AiResults.unknownAction("list", "create", "update", "delete");
        };
    }

    private Map<String, Object> findSku(long id) {
        for (Map<String, Object> row : adminService.listSkus()) {
            Object value = row.get("id");
            long rowId = value instanceof Number number ? number.longValue() : 0;
            if (rowId == id) {
                return row;
            }
        }
        throw new com.eurasia.nursery.common.BusinessException("品种规格不存在");
    }

    private List<Map<String, Object>> filterSkus(JsonNode args) {
        List<Map<String, Object>> rows = new ArrayList<>(adminService.listSkus());
        String variety = AiArgs.text(args, "variety");
        String specification = AiArgs.text(args, "specification");
        if (!variety.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("variety"), variety)).toList();
        }
        if (!specification.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("specification"), specification)).toList();
        }
        return rows;
    }

    private Object customersHandle(UserView caller, JsonNode args) {
        String action = AiArgs.action(args);
        if ("list".equals(action)) {
            if (access.canAnyPage(caller, "admin") || "ADMIN".equals(caller.getRoleCode())) {
                return AiResults.listed(filterCustomers(args));
            }
            access.requireAnyPage(caller, "sal", "orders");
            return AiResults.listed(salesService.listSalesCustomers(caller, AiArgs.blankToNull(AiArgs.text(args, "region")),
                    AiArgs.blankToNull(AiArgs.text(args, "district"))));
        }
        access.requireAdmin(caller);
        return switch (action) {
            case "create" -> writes.run(caller, "customers", "create", "创建客户 " + AiArgs.text(args, "name"), null, false, true,
                    () -> adminService.createCustomer(AiArgs.pick(objectMapper, args, "name", "contactName", "region", "district", "phone", "level")));
            case "update" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findCustomer(id);
                yield writes.run(caller, "customers", "update", "修改客户 " + before.get("name"), before, false, true,
                        () -> adminService.updateCustomer(id, AiArgs.pick(objectMapper, args, "name", "contactName", "region", "district", "phone", "level")));
            }
            case "delete" -> {
                long id = AiArgs.requiredLong(args, "id");
                Map<String, Object> before = findCustomer(id);
                String summary = "删除客户 " + before.get("name") + "（id " + id + "）";
                yield writes.run(caller, "customers", "delete", summary, before, true, false, () -> {
                    adminService.deleteCustomer(id);
                    return AiResults.deleted(id);
                });
            }
            default -> AiResults.unknownAction("list", "create", "update", "delete");
        };
    }

    private Map<String, Object> findCustomer(long id) {
        for (Map<String, Object> row : adminService.listCustomers()) {
            Object value = row.get("id");
            long rowId = value instanceof Number number ? number.longValue() : 0;
            if (rowId == id) {
                return row;
            }
        }
        throw new com.eurasia.nursery.common.BusinessException("客户不存在");
    }

    private List<Map<String, Object>> filterCustomers(JsonNode args) {
        List<Map<String, Object>> rows = new ArrayList<>(adminService.listCustomers());
        String name = AiArgs.text(args, "name");
        String region = AiArgs.text(args, "region");
        String district = AiArgs.text(args, "district");
        if (!name.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("name"), name)).toList();
        }
        if (!region.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("region"), region)).toList();
        }
        if (!district.isEmpty()) {
            rows = rows.stream().filter(row -> AiArgs.containsText(row.get("district"), district)).toList();
        }
        return rows;
    }
}
