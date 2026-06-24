package com.eurasia.nursery.config;

import com.eurasia.nursery.mapper.SysUserMapper;
import com.eurasia.nursery.domain.model.UserView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class TeamUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TeamUserInitializer.class);

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;

    public TeamUserInitializer(SysUserMapper sysUserMapper, PasswordEncoder passwordEncoder) {
        this.sysUserMapper = sysUserMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String[][] accounts = {
                {"ych", "ych", "ych123"},
                {"zzj", "zzj", "zzj123"},
                {"frx", "frx", "frx123"},
                {"zfl", "zfl", "zfl123"},
                {"cyy", "cyy", "cyy123"},
                {"admin", "系统管理员", "123456"},
                {"inventory1", "库存管理员", "123456"},
                {"sales1", "销售员", "123456"},
                {"finance1", "财务人员", "123456"}
        };
        String[] roleCodes = {"ADMIN", "ADMIN", "ADMIN", "ADMIN", "ADMIN", "ADMIN", "INVENTORY", "SALES", "FINANCE"};

        for (int i = 0; i < accounts.length; i++) {
            upsert(accounts[i][0], accounts[i][1], accounts[i][2], roleCodes[i]);
        }
    }

    private void upsert(String username, String displayName, String password, String roleCode) {
        UserView existing = sysUserMapper.findByUsername(username);
        String hash = passwordEncoder.encode(password);
        if (existing == null) {
            UserView user = new UserView();
            user.setUsername(username);
            user.setDisplayName(displayName);
            user.setPasswordHash(hash);
            user.setRoleId(roleId(roleCode));
            user.setStatus("OFFLINE");
            sysUserMapper.insert(user);
            log.info("created user {} / {}", username, password);
        } else {
            sysUserMapper.updatePassword(existing.getId(), hash);
            log.info("updated password for {}", username);
        }
    }

    private Long roleId(String roleCode) {
        Long id = switch (roleCode) {
            case "INVENTORY" -> 2L;
            case "SALES" -> 3L;
            case "FINANCE" -> 4L;
            default -> 1L;
        };
        return id;
    }
}
