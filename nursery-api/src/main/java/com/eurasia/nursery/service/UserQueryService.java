package com.eurasia.nursery.service;

import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.SysUserMapper;
import org.springframework.stereotype.Service;

@Service
public class UserQueryService {

    private final SysUserMapper sysUserMapper;

    public UserQueryService(SysUserMapper sysUserMapper) {
        this.sysUserMapper = sysUserMapper;
    }

    public UserView findByUsername(String username) {
        return sysUserMapper.findByUsername(username);
    }

    public UserView findByPhone(String phone) {
        return sysUserMapper.findByPhone(phone);
    }

    public UserView findById(Long id) {
        return sysUserMapper.findById(id);
    }
}
