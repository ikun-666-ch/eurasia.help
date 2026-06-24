package com.eurasia.nursery.config;

import com.eurasia.nursery.domain.entity.*;
import com.eurasia.nursery.domain.enums.OrderStatus;
import com.eurasia.nursery.domain.enums.StockRecordType;
import com.eurasia.nursery.domain.enums.UserStatus;
import com.eurasia.nursery.domain.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            SysRoleRepository roleRepo,
            SysUserRepository userRepo,
            SeedlingCategoryRepository categoryRepo,
            CustomerRepository customerRepo,
            InventorySkuRepository skuRepo,
            InventoryStockRepository stockRepo,
            StockRecordRepository recordRepo,
            SalesOrderRepository orderRepo,
            FinanceMonthlyRepository financeRepo,
            PasswordEncoder encoder) {
        return args -> {
            SysRole admin = ensureRole(roleRepo, "ADMIN", "系统管理员", "用户·权限·品类·客户·系统配置");
            SysRole inventory = ensureRole(roleRepo, "INVENTORY", "库存管理员", "入库·出库·盘点·库存调整");
            SysRole sales = ensureRole(roleRepo, "SALES", "销售员", "订单·客户跟进·订单状态");
            SysRole finance = ensureRole(roleRepo, "FINANCE", "财务人员", "报表·资产统计·利润分析");

            if (userRepo.count() > 0) {
                return;
            }

            userRepo.saveAll(java.util.List.of(
                    user("admin", "张管理", admin, encoder),
                    user("inventory1", "李库存", inventory, encoder),
                    user("sales1", "王销售", sales, encoder),
                    user("finance1", "赵财务", finance, encoder)));

            if (categoryRepo.count() > 0) {
                return;
            }

            SeedlingCategory tree = cat(null, "乔木类", 1, 1);
            SeedlingCategory shrub = cat(null, "灌木类", 1, 2);
            SeedlingCategory ground = cat(null, "地被类", 1, 3);
            SeedlingCategory container = cat(null, "容器苗", 1, 4);
            categoryRepo.saveAll(java.util.List.of(tree, shrub, ground, container));

            SeedlingCategory guohuai = cat(tree.getId(), "国槐", 2, 1);
            SeedlingCategory yinxing = cat(tree.getId(), "银杏", 2, 2);
            categoryRepo.saveAll(java.util.List.of(guohuai, yinxing));

            Customer c1 = customer("西安园林绿化局", "刘主任", "西安市", "A");
            Customer c2 = customer("宝鸡市政建设公司", "陈经理", "宝鸡市", "B");
            customerRepo.saveAll(java.util.List.of(c1, c2));

            InventorySku sku1 = sku("国槐", "胸径8cm", guohuai.getId());
            InventorySku sku2 = sku("银杏", "胸径10cm", yinxing.getId());
            skuRepo.saveAll(java.util.List.of(sku1, sku2));

            InventoryStock st1 = stock(sku1, "主仓库", "西安市", "45.20");
            InventoryStock st2 = stock(sku2, "东库", "宝鸡市", "50.10");
            stockRepo.saveAll(java.util.List.of(st1, st2));

            StockRecord rec = new StockRecord();
            rec.setSku(sku1);
            rec.setRecordType(StockRecordType.IN);
            rec.setQuantity(new BigDecimal("20.00"));
            rec.setRemark("春季补苗入库");
            recordRepo.save(rec);

            SalesOrder order = new SalesOrder();
            order.setOrderNo("SO202506001");
            order.setCustomer(c1);
            order.setStatus(OrderStatus.DONE);
            order.setTotalAmount(new BigDecimal("128000.00"));
            order.setSatisfaction(5);
            orderRepo.save(order);

            YearMonth now = YearMonth.now();
            for (int i = 5; i >= 0; i--) {
                YearMonth ym = now.minusMonths(i);
                FinanceMonthly fm = new FinanceMonthly();
                fm.setYearMonth(ym.toString());
                fm.setRevenue(new BigDecimal(300000 + i * 20000));
                fm.setCost(new BigDecimal(200000 + i * 10000));
                fm.setProfit(new BigDecimal(100000 + i * 10000));
                fm.setAssetValue(new BigDecimal(1600000 + i * 50000));
                financeRepo.save(fm);
            }
        };
    }

    private static SysRole ensureRole(SysRoleRepository repo, String code, String name, String perms) {
        return repo.findByCode(code).orElseGet(() -> {
            SysRole r = new SysRole();
            r.setCode(code);
            r.setName(name);
            r.setPermissions(perms);
            return repo.save(r);
        });
    }

    private static SysUser user(String username, String displayName, SysRole role, PasswordEncoder encoder) {
        SysUser u = new SysUser();
        u.setUsername(username);
        u.setDisplayName(displayName);
        u.setPasswordHash(encoder.encode("123456"));
        u.setRole(role);
        u.setStatus(UserStatus.OFFLINE);
        u.setLastLoginAt(LocalDateTime.now().minusHours(1));
        return u;
    }

    private static SeedlingCategory cat(Long parentId, String name, int level, int sort) {
        SeedlingCategory c = new SeedlingCategory();
        c.setParentId(parentId);
        c.setName(name);
        c.setLevel(level);
        c.setSortOrder(sort);
        return c;
    }

    private static Customer customer(String name, String contact, String region, String level) {
        Customer c = new Customer();
        c.setName(name);
        c.setContactName(contact);
        c.setRegion(region);
        c.setLevel(level);
        return c;
    }

    private static InventorySku sku(String variety, String spec, Long categoryId) {
        InventorySku s = new InventorySku();
        s.setVariety(variety);
        s.setSpecification(spec);
        s.setCategoryId(categoryId);
        return s;
    }

    private static InventoryStock stock(InventorySku sku, String warehouse, String city, String qty) {
        InventoryStock s = new InventoryStock();
        s.setSku(sku);
        s.setWarehouse(warehouse);
        s.setCity(city);
        s.setQuantity(new BigDecimal(qty));
        return s;
    }
}
