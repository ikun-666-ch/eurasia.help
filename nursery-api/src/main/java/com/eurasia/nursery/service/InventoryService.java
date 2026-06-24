package com.eurasia.nursery.service;

import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.domain.model.UserView;
import com.eurasia.nursery.mapper.InventoryStockMapper;
import com.eurasia.nursery.mapper.SkuMapper;
import com.eurasia.nursery.mapper.StockRecordMapper;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InventoryService {

    private final InventoryStockMapper inventoryStockMapper;
    private final SkuMapper skuMapper;
    private final StockRecordMapper stockRecordMapper;
    private final DailyDataService dailyDataService;
    private final ObjectMapper objectMapper;

    public InventoryService(
            InventoryStockMapper inventoryStockMapper,
            SkuMapper skuMapper,
            StockRecordMapper stockRecordMapper,
            ObjectMapper objectMapper,
            DailyDataService dailyDataService) {
        this.inventoryStockMapper = inventoryStockMapper;
        this.skuMapper = skuMapper;
        this.stockRecordMapper = stockRecordMapper;
        this.dailyDataService = dailyDataService;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> listLedger() {
        return inventoryStockMapper.listLedger().stream().map(this::mapLedger).toList();
    }

    public Map<String, Object> createLedger(UserView operator, Map<String, Object> body) {
        String variety = trim(body.get("variety"));
        String specification = trim(body.get("specification"));
        if (variety.isEmpty() || specification.isEmpty()) {
            throw new BusinessException("品种和规格不能为空");
        }
        double qty = doubleVal(body.get("quantity"));
        Long skuId = findOrCreateSku(variety, specification);
        String warehouse = body.containsKey("warehouse")
                ? String.valueOf(body.get("warehouse"))
                : "主仓库";
        String city = nullableStr(body.get("city"));
        inventoryStockMapper.insert(skuId, warehouse, city, BigDecimal.valueOf(qty));
        Long stockId = inventoryStockMapper.lastInsertId();
        if (qty > 0) {
            stockRecordMapper.insert(skuId, "IN", BigDecimal.valueOf(qty), "台账入库", operator.getId(), toJson(body.get("media")));
        }
        return getLedger(stockId);
    }

    public Map<String, Object> updateLedger(long id, Map<String, Object> body) {
        Map<String, Object> row = inventoryStockMapper.findById(id);
        if (row == null) {
            throw new BusinessException("库存记录不存在");
        }
        Long skuId = ((Number) row.get("sku_id")).longValue();
        Map<String, Object> sku = skuMapper.findById(skuId);
        if (sku == null) {
            throw new BusinessException("品种规格不存在");
        }
        String variety = body.containsKey("variety") && !trim(body.get("variety")).isEmpty()
                ? trim(body.get("variety"))
                : String.valueOf(sku.get("variety"));
        String specification = body.containsKey("specification") && !trim(body.get("specification")).isEmpty()
                ? trim(body.get("specification"))
                : String.valueOf(sku.get("specification"));
        skuMapper.update(skuId, variety, specification,
                sku.get("categoryId") != null ? ((Number) sku.get("categoryId")).longValue() : null);

        String city = body.containsKey("city") ? nullableStr(body.get("city")) : nullableStr(row.get("city"));
        String warehouse = body.containsKey("warehouse")
                ? String.valueOf(body.get("warehouse"))
                : String.valueOf(row.get("warehouse"));
        BigDecimal quantity = body.containsKey("quantity")
                ? BigDecimal.valueOf(doubleVal(body.get("quantity")))
                : (BigDecimal) row.get("quantity");
        inventoryStockMapper.update(id, city, warehouse, quantity);
        return getLedger(id);
    }

    public void deleteLedger(long id) {
        inventoryStockMapper.delete(id);
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

    public Map<String, Object> dailyTrend(String city) {
        return dailyDataService.invStockTrend(city);
    }

    public Map<String, Object> ioTrend(String city) {
        return dailyDataService.invIoTrend(city);
    }

    private Map<String, Object> getLedger(long id) {
        Map<String, Object> r = inventoryStockMapper.findLedgerById(id);
        if (r == null) {
            throw new BusinessException("库存记录不存在");
        }
        return mapLedger(r);
    }

    private Long findOrCreateSku(String variety, String specification) {
        Long id = skuMapper.findDuplicate(variety, specification);
        if (id != null) {
            return id;
        }
        skuMapper.insert(variety, specification, null);
        return skuMapper.lastInsertId();
    }

    private Map<String, Object> mapLedger(Map<String, Object> r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", ((Number) r.get("id")).intValue());
        out.put("variety", r.get("variety"));
        out.put("specification", r.get("specification"));
        out.put("quantity", ((Number) r.get("quantity")).doubleValue());
        out.put("city", r.get("city"));
        return out;
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

    private static double doubleVal(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }

    private String toJson(Object value) {
        if (value instanceof String s) return s;
        if (value == null) return null;
        try { return objectMapper.writeValueAsString(value); } catch (Exception e) { return null; }
    }
}
