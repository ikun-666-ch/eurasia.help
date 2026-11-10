package com.eurasia.nursery.ai;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.service.PageAccessService;
import org.springframework.stereotype.Component;

/** 工具权限与现有接口一致：不因打开 Agent 而提升角色。 */
@Component
public class AiAccess {

    private final PageAccessService pageAccessService;

    public AiAccess(PageAccessService pageAccessService) {
        this.pageAccessService = pageAccessService;
    }

    public void requireAdmin(UserView user) {
        requireRoles(user, "ADMIN");
    }

    public void requireRoles(UserView user, String... roles) {
        String code = user == null || user.getRoleCode() == null ? "" : user.getRoleCode();
        for (String role : roles) {
            if (role.equals(code)) {
                return;
            }
        }
        throw new BusinessException("权限不足", 403);
    }

    public void requireAnyPage(UserView user, String... pages) {
        if (!canAnyPage(user, pages)) {
            throw new BusinessException("权限不足", 403);
        }
    }

    public boolean canAnyPage(UserView user, String... pages) {
        if (user == null) {
            return false;
        }
        for (String page : pages) {
            if (pageAccessService.canAccess(user.getRoleCode(), user.getExtraPageAccess(), page)) {
                return true;
            }
        }
        return false;
    }
}
