import { useEffect, useState } from "react";
import {
  createCustomer,
  createInventoryRow,
  createSku,
  createUser,
  deleteCustomer,
  deleteInventoryRow,
  deleteSku,
  deleteUser,
  fetchCustomers,
  fetchFinanceAssetStats,
  fetchFinanceSalesTrend,
  fetchFinanceSummary,
  fetchInventoryLedger,
  fetchPanelConfig,
  fetchRoles,
  fetchSalesOrders,
  fetchSkus,
  fetchUsers,
  resetUserPassword,
  savePanelConfig,
  updateFinanceAssetStats,
  updateFinanceSalesTrend,
  updateFinanceSettings,
  updateCustomer,
  updateFinanceMonth,
  updateInventoryRow,
  updateRole,
  updateSku,
  updateSalesOrder,
  updateUser,
} from "@/api";
import { USER_STATUS_OPTIONS } from "@/pages/Admin/adminUtils";
import type {
  SkuRow,
  CustomerRow,
  InventoryLedgerRow,
  RoleRow,
  SalesOrderRow,
  UserRow,
} from "@/api/types";
import {
  csvNums,
  csvStr,
  defaultAssetExtra,
  defaultBar,
  defaultDualLine,
  defaultInvTrend,
  defaultIoLine,
  normalizeIoLine,
  recentDateLabels,
  resizeIoLineLabels,
  withRollingIoLabels,
  defaultPie,
  defaultRadar,
  defaultRankBar,
  defaultRevenue,
  defaultStats,
  type AssetExtraConfig,
  type BarConfig,
  type DualLineConfig,
  type InvTrendConfig,
  type IoLineConfig,
  type PieConfig,
  type RadarConfig,
  type RankBarConfig,
  type RevenueConfig,
  type StatsConfig,
} from "./panelConfigDefaults";
import { SHANXI_CITIES } from "@/pages/Inv/constants";
import {
  computeProvinceSeries,
  normalizeInvTrend,
  resizeInvTrendSeries,
} from "@/pages/Inv/invTrendUtils";
import { Field, Form, Hint, MiniBtn, Row, Table } from "./formStyles";

export type PanelEditorType =
  | "chart-dual-line"
  | "chart-inv-province"
  | "chart-inv-city"
  | "chart-io"
  | "chart-bar"
  | "chart-pie"
  | "chart-rank"
  | "chart-revenue"
  | "chart-stats"
  | "chart-radar"
  | "chart-asset-extra"
  | "api-inventory"
  | "api-sales"
  | "api-finance-monthly"
  | "api-finance-chart1"
  | "api-finance-trend-province"
  | "api-finance-trend-city"
  | "api-finance-asset-stats"
  | "api-finance-asset-hint"
  | "api-finance-sales-hint"
  | "api-admin-users"
  | "api-admin-roles"
  | "api-admin-categories"
  | "api-admin-customers"
  | "api-admin-kpi";

type EditorProps = {
  panelKey?: string;
  editorContext?: Record<string, unknown>;
  registerSave: (fn: () => Promise<void>) => void;
};

function useConfigEditor<T extends Record<string, unknown>>(
  panelKey: string,
  fallback: () => T,
  registerSave: (fn: () => Promise<void>) => void
) {
  const [cfg, setCfg] = useState<T>(fallback);

  useEffect(() => {
    fetchPanelConfig(panelKey).then((remote) => {
      if (remote && Object.keys(remote).length > 0) {
        setCfg({ ...fallback(), ...(remote as Partial<T>) });
      }
    });
  }, [panelKey]);

  useEffect(() => {
    registerSave(async () => {
      await savePanelConfig(panelKey, cfg as Record<string, unknown>);
    });
  }, [cfg, panelKey, registerSave]);

  return [cfg, setCfg] as const;
}

function DualLineEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(
    panelKey!,
    defaultDualLine,
    registerSave
  );
  const c = cfg as DualLineConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>横轴标签与两组数值，逗号分隔。保存后左侧预览会刷新。</Hint>
      <Row>
        <Field>
          <span>系列一标题</span>
          <input
            value={c.title1}
            onChange={(e) => setCfg({ ...c, title1: e.target.value })}
          />
        </Field>
        <Field>
          <span>系列二标题</span>
          <input
            value={c.title2}
            onChange={(e) => setCfg({ ...c, title2: e.target.value })}
          />
        </Field>
      </Row>
      <Field>
        <span>日期标签（逗号分隔）</span>
        <input
          value={c.labels.join(",")}
          onChange={(e) => setCfg({ ...c, labels: csvStr(e.target.value) })}
        />
      </Field>
      <Field>
        <span>系列一数值</span>
        <input
          value={c.series1.join(",")}
          onChange={(e) => setCfg({ ...c, series1: csvNums(e.target.value) })}
        />
      </Field>
      <Field>
        <span>系列二数值</span>
        <input
          value={c.series2.join(",")}
          onChange={(e) => setCfg({ ...c, series2: csvNums(e.target.value) })}
        />
      </Field>
    </Form>
  );
}

function InvProvinceTrendEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useState<InvTrendConfig>(defaultInvTrend);

  useEffect(() => {
    fetchPanelConfig(panelKey!).then((remote) => {
      setCfg(normalizeInvTrend(remote as Partial<InvTrendConfig>));
    });
  }, [panelKey]);

  useEffect(() => {
    registerSave(async () => {
      await savePanelConfig(panelKey!, { cities: cfg.cities });
    });
  }, [cfg, panelKey, registerSave]);

  const province = computeProvinceSeries(cfg);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        全省曲线由各市值按日自动相加。数值固定保存，日期每天打开页面时自动更新为最近{" "}
        {cfg.labels.length} 天。
      </Hint>
      <Field>
        <span>当前日期轴（只读，每天自动滚动）</span>
        <input readOnly value={cfg.labels.join(",")} />
      </Field>
      <Field>
        <span>全省合计（只读，与各市之和一致）</span>
        <input readOnly value={province.join(",")} />
      </Field>
      <Table>
        <thead>
          <tr>
            <th>地市</th>
            <th>最新一日</th>
          </tr>
        </thead>
        <tbody>
          {SHANXI_CITIES.map((city) => (
            <tr key={city}>
              <td>{city}</td>
              <td>{cfg.cities[city]?.[cfg.labels.length - 1] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function InvCityTrendEditor({
  panelKey,
  editorContext,
  registerSave,
}: EditorProps) {
  const city = String(editorContext?.city ?? "西安市");
  const [cfg, setCfg] = useState<InvTrendConfig>(defaultInvTrend);

  useEffect(() => {
    fetchPanelConfig(panelKey!).then((remote) => {
      setCfg(normalizeInvTrend(remote as Partial<InvTrendConfig>));
    });
  }, [panelKey]);

  useEffect(() => {
    registerSave(async () => {
      await savePanelConfig(panelKey!, { cities: cfg.cities });
    });
  }, [cfg, panelKey, registerSave]);

  const series = cfg.cities[city] ?? [];
  const province = computeProvinceSeries(cfg);
  const lastIdx = Math.max(0, cfg.labels.length - 1);
  const citySum = SHANXI_CITIES.reduce(
    (s, c) => s + (cfg.cities[c]?.[lastIdx] ?? 0),
    0
  );

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        正在编辑「{city}」库存趋势。保存后全省最新一日合计为 {citySum}，与全省曲线{" "}
        {province[lastIdx] ?? 0} 一致。日期每天自动更新。
      </Hint>
      <Field>
        <span>{city} 每日库存（逗号分隔，共 {cfg.labels.length} 项）</span>
        <input
          value={series.join(",")}
          onChange={(e) => {
            const values = csvNums(e.target.value);
            setCfg(
              resizeInvTrendSeries(
                cfg,
                city,
                Array.from(
                  { length: values.length },
                  (_, i) => values[i] ?? 0
                )
              )
            );
          }}
        />
      </Field>
      <Field>
        <span>当前日期轴（只读）</span>
        <input readOnly value={cfg.labels.join(",")} />
      </Field>
    </Form>
  );
}

function FinProvinceTrendApiEditor({ registerSave }: EditorProps) {
  const [labels, setLabels] = useState<string[]>([]);
  const [thisYear, setThisYear] = useState<number[]>([]);
  const [lastYear, setLastYear] = useState<number[]>([]);
  const [cityRows, setCityRows] = useState<
    { city: string; thisVal: number; lastVal: number }[]
  >([]);

  useEffect(() => {
    fetchFinanceSalesTrend().then((t) => {
      setLabels(t.labels);
      setThisYear(t.thisYear);
      setLastYear(t.lastYear);
    });
    Promise.all(SHANXI_CITIES.map((c) => fetchFinanceSalesTrend(c))).then(
      (rows) => {
        const idx = Math.max(0, (rows[0]?.thisYear.length ?? 1) - 1);
        setCityRows(
          SHANXI_CITIES.map((city, i) => ({
            city,
            thisVal: rows[i]?.thisYear[idx] ?? 0,
            lastVal: rows[i]?.lastYear[idx] ?? 0,
          }))
        );
      }
    );
  }, []);

  useEffect(() => {
    registerSave(async () => {});
  }, [registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        展示未来 10 日销售预测：数值固定，横轴日期随今天自动滚动。单位：万元。请点选地图后编辑单市数据。
      </Hint>
      <Field>
        <span>日期轴（只读）</span>
        <input readOnly value={labels.join(",")} />
      </Field>
      <Field>
        <span>全省今年（只读，万元）</span>
        <input readOnly value={thisYear.join(",")} />
      </Field>
      <Field>
        <span>全省去年（只读，万元）</span>
        <input readOnly value={lastYear.join(",")} />
      </Field>
      <Table>
        <thead>
          <tr>
            <th>地市</th>
            <th>今年最新</th>
            <th>去年最新</th>
          </tr>
        </thead>
        <tbody>
          {cityRows.map((row) => (
            <tr key={row.city}>
              <td>{row.city}</td>
              <td>{row.thisVal}</td>
              <td>{row.lastVal}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function FinCityTrendApiEditor({
  editorContext,
  registerSave,
}: EditorProps) {
  const city = String(editorContext?.city ?? "西安市");
  const [labels, setLabels] = useState<string[]>([]);
  const [thisYear, setThisYear] = useState<number[]>([]);
  const [lastYear, setLastYear] = useState<number[]>([]);

  useEffect(() => {
    fetchFinanceSalesTrend(city).then((t) => {
      setLabels(t.labels);
      setThisYear(t.thisYear);
      setLastYear(t.lastYear);
    });
  }, [city]);

  useEffect(() => {
    registerSave(async () => {
      await updateFinanceSalesTrend({ city, thisYear, lastYear });
    });
  }, [city, thisYear, lastYear, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        编辑「{city}」未来 10 日预测（固定数值，日期随今天滚动），写入 finance_daily_revenue 表。单位：万元。
      </Hint>
      <Field>
        <span>{city} 今年（逗号分隔）</span>
        <input
          value={thisYear.join(",")}
          onChange={(e) => setThisYear(csvNums(e.target.value))}
        />
      </Field>
      <Field>
        <span>{city} 去年（逗号分隔）</span>
        <input
          value={lastYear.join(",")}
          onChange={(e) => setLastYear(csvNums(e.target.value))}
        />
      </Field>
      <Field>
        <span>日期轴（只读）</span>
        <input readOnly value={labels.join(",")} />
      </Field>
    </Form>
  );
}

function FinanceAssetStatsEditor({
  editorContext,
  registerSave,
}: EditorProps) {
  const city = String(editorContext?.city ?? "西安市");
  const [items, setItems] = useState<StatsConfig["items"]>(defaultStats().items);

  useEffect(() => {
    fetchFinanceAssetStats(city).then((r) => {
      if (r.items.length) setItems(r.items);
    });
  }, [city]);

  useEffect(() => {
    registerSave(async () => {
      await updateFinanceAssetStats({ city, items });
    });
  }, [city, items, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>编辑「{city}」苗圃资产分布，写入 nursery_asset_stat 表。</Hint>
      {items.map((item, i) => (
        <Row key={i}>
          <Field>
            <span>指标 {i + 1}</span>
            <input
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, label: e.target.value };
                setItems(next);
              }}
            />
          </Field>
          <Field>
            <span>数值</span>
            <input
              type="number"
              value={item.value}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, value: Number(e.target.value) };
                setItems(next);
              }}
            />
          </Field>
          <Field>
            <span>副指标</span>
            <input
              value={item.label2}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, label2: e.target.value };
                setItems(next);
              }}
            />
          </Field>
          <Field>
            <span>副数值</span>
            <input
              type="number"
              value={item.value2}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, value2: Number(e.target.value) };
                setItems(next);
              }}
            />
          </Field>
          <Field>
            <span>单位</span>
            <input
              value={item.unit}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, unit: e.target.value };
                setItems(next);
              }}
            />
          </Field>
        </Row>
      ))}
    </Form>
  );
}

function FinanceReadonlyHint({
  registerSave,
  children,
}: {
  registerSave: (fn: () => Promise<void>) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    registerSave(async () => {});
  }, [registerSave]);
  return <Hint>{children}</Hint>;
}

function IoEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useState<IoLineConfig>(defaultIoLine);

  useEffect(() => {
    fetchPanelConfig(panelKey!).then((remote) => {
      setCfg(normalizeIoLine(remote as Partial<IoLineConfig>));
    });
  }, [panelKey]);

  useEffect(() => {
    registerSave(async () => {
      await savePanelConfig(panelKey!, {
        inbound: cfg.inbound,
        outbound: cfg.outbound,
      });
    });
  }, [cfg, panelKey, registerSave]);

  const c = cfg;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        入库/出库数值固定保存；日期每天自动更新。图表默认显示最近 10 天，可拖动滑块查看更早数据。
      </Hint>
      <Field>
        <span>当前日期轴（只读，每天自动滚动）</span>
        <input readOnly value={c.labels.join(",")} />
      </Field>
      <Field>
        <span>入库量</span>
        <input
          value={c.inbound.join(",")}
          onChange={(e) => {
            const inbound = csvNums(e.target.value);
            const len = Math.max(inbound.length, c.outbound.length);
            setCfg(
              withRollingIoLabels(
                resizeIoLineLabels(
                  { labels: [], inbound, outbound: c.outbound },
                  recentDateLabels(len)
                )
              )
            );
          }}
        />
      </Field>
      <Field>
        <span>出库量</span>
        <input
          value={c.outbound.join(",")}
          onChange={(e) => {
            const outbound = csvNums(e.target.value);
            const len = Math.max(c.inbound.length, outbound.length);
            setCfg(
              withRollingIoLabels(
                resizeIoLineLabels(
                  { labels: [], inbound: c.inbound, outbound },
                  recentDateLabels(len)
                )
              )
            );
          }}
        />
      </Field>
    </Form>
  );
}

function BarEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultBar, registerSave);
  const c = cfg as BarConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Field>
        <span>分类标签</span>
        <input
          value={c.labels.join(",")}
          onChange={(e) => setCfg({ ...c, labels: csvStr(e.target.value) })}
        />
      </Field>
      <Field>
        <span>数值</span>
        <input
          value={c.values.join(",")}
          onChange={(e) => setCfg({ ...c, values: csvNums(e.target.value) })}
        />
      </Field>
    </Form>
  );
}

function PieEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultPie, registerSave);
  const c = cfg as PieConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>每行：名称,数值</Hint>
      <Field>
        <span>饼图数据</span>
        <textarea
          value={c.items.map((i) => `${i.name},${i.value}`).join("\n")}
          onChange={(e) => {
            const items = e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, val] = line.split(/[,，]/);
                return { name: name?.trim() || "", value: Number(val) || 0 };
              });
            setCfg({ ...c, items });
          }}
        />
      </Field>
    </Form>
  );
}

function RankEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultRankBar, registerSave);
  const c = cfg as RankBarConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Field>
        <span>地市/名称</span>
        <input
          value={c.labels.join(",")}
          onChange={(e) => setCfg({ ...c, labels: csvStr(e.target.value) })}
        />
      </Field>
      <Field>
        <span>指标值</span>
        <input
          value={c.values.join(",")}
          onChange={(e) => setCfg({ ...c, values: csvNums(e.target.value) })}
        />
      </Field>
    </Form>
  );
}

function RevenueEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultRevenue, registerSave);
  const c = cfg as RevenueConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Row>
        <Field>
          <span>收益总计</span>
          <input
            type="number"
            value={c.total}
            onChange={(e) => setCfg({ ...c, total: Number(e.target.value) })}
          />
        </Field>
        <Field>
          <span>企业数量</span>
          <input
            type="number"
            value={c.companyCount}
            onChange={(e) =>
              setCfg({ ...c, companyCount: Number(e.target.value) })
            }
          />
        </Field>
      </Row>
      <Field>
        <span>月度收益曲线</span>
        <input
          value={c.values.join(",")}
          onChange={(e) => setCfg({ ...c, values: csvNums(e.target.value) })}
        />
      </Field>
    </Form>
  );
}

function StatsEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultStats, registerSave);
  const c = cfg as StatsConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th>指标</th>
            <th>值</th>
            <th>副标</th>
            <th>副值</th>
            <th>单位</th>
          </tr>
        </thead>
        <tbody>
          {c.items.map((item, idx) => (
            <tr key={idx}>
              <td>
                <input
                  value={item.label}
                  onChange={(e) => {
                    const items = [...c.items];
                    items[idx] = { ...item, label: e.target.value };
                    setCfg({ ...c, items });
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => {
                    const items = [...c.items];
                    items[idx] = { ...item, value: Number(e.target.value) };
                    setCfg({ ...c, items });
                  }}
                />
              </td>
              <td>
                <input
                  value={item.label2}
                  onChange={(e) => {
                    const items = [...c.items];
                    items[idx] = { ...item, label2: e.target.value };
                    setCfg({ ...c, items });
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.value2}
                  onChange={(e) => {
                    const items = [...c.items];
                    items[idx] = { ...item, value2: Number(e.target.value) };
                    setCfg({ ...c, items });
                  }}
                />
              </td>
              <td>
                <input
                  value={item.unit}
                  onChange={(e) => {
                    const items = [...c.items];
                    items[idx] = { ...item, unit: e.target.value };
                    setCfg({ ...c, items });
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function RadarEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(panelKey!, defaultRadar, registerSave);
  const c = cfg as RadarConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Field>
        <span>维度（名称:最大值，每行一个）</span>
        <textarea
          value={c.indicators.map((i) => `${i.name}:${i.max}`).join("\n")}
          onChange={(e) => {
            const indicators = e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, max] = line.split(":");
                return { name: name?.trim() || "", max: Number(max) || 100 };
              });
            setCfg({ ...c, indicators });
          }}
        />
      </Field>
      <Field>
        <span>各维度数值（逗号分隔）</span>
        <input
          value={c.values.join(",")}
          onChange={(e) => setCfg({ ...c, values: csvNums(e.target.value) })}
        />
      </Field>
    </Form>
  );
}

function AssetExtraEditor({ panelKey, registerSave }: EditorProps) {
  const [cfg, setCfg] = useConfigEditor(
    panelKey!,
    defaultAssetExtra,
    registerSave
  );
  const c = cfg as AssetExtraConfig;
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>资产总值来自财务 API；此处编辑增长率条与季度占比饼图。</Hint>
      <Field>
        <span>增长率条（逗号分隔 %）</span>
        <input
          value={c.growthRates.join(",")}
          onChange={(e) =>
            setCfg({ ...c, growthRates: csvNums(e.target.value) })
          }
        />
      </Field>
      <Field>
        <span>季度占比（名称,数值 每行）</span>
        <textarea
          value={c.pieItems.map((i) => `${i.name},${i.value}`).join("\n")}
          onChange={(e) => {
            const pieItems = e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, val] = line.split(/[,，]/);
                return { name: name?.trim() || "", value: Number(val) || 0 };
              });
            setCfg({ ...c, pieItems });
          }}
        />
      </Field>
    </Form>
  );
}

function InventoryEditor({ registerSave }: EditorProps) {
  const [rows, setRows] = useState<InventoryLedgerRow[]>([]);
  const [draft, setDraft] = useState({
    variety: "",
    specification: "",
    quantity: 0,
    city: "",
  });

  useEffect(() => {
    fetchInventoryLedger().then(setRows);
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        rows.map((r) =>
          updateInventoryRow(r.id, {
            variety: r.variety,
            specification: r.specification,
            quantity: Number(r.quantity),
            city: r.city,
          })
        )
      );
    });
  }, [rows, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th>品种</th>
            <th>规格</th>
            <th>数量</th>
            <th>地市</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td>
                <input
                  value={r.variety}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, variety: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={r.specification}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, specification: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={r.quantity}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, quantity: Number(e.target.value) };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={r.city}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, city: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <MiniBtn
                  type="button"
                  onClick={async () => {
                    await deleteInventoryRow(r.id);
                    setRows((prev) => prev.filter((x) => x.id !== r.id));
                  }}>
                  删
                </MiniBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Row>
        <Field>
          <span>新品种</span>
          <input
            value={draft.variety}
            onChange={(e) => setDraft({ ...draft, variety: e.target.value })}
          />
        </Field>
        <Field>
          <span>规格</span>
          <input
            value={draft.specification}
            onChange={(e) =>
              setDraft({ ...draft, specification: e.target.value })
            }
          />
        </Field>
      </Row>
      <Row>
        <Field>
          <span>数量(万株)</span>
          <input
            type="number"
            value={draft.quantity}
            onChange={(e) =>
              setDraft({ ...draft, quantity: Number(e.target.value) })
            }
          />
        </Field>
        <Field>
          <span>地市</span>
          <input
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          />
        </Field>
      </Row>
      <MiniBtn
        type="button"
        onClick={async () => {
          const created = await createInventoryRow(draft);
          setRows((prev) => [...prev, created]);
          setDraft({ variety: "", specification: "", quantity: 0, city: "" });
        }}>
        + 新增一行
      </MiniBtn>
    </Form>
  );
}

function SalesEditor({ registerSave }: EditorProps) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchSalesOrders()]).then(([c, o]) => {
      setCustomers(c);
      setOrders(o);
    });
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        orders.map((o) =>
          updateSalesOrder(o.id, {
            status: o.status,
            totalAmount: Number(o.totalAmount),
            satisfaction: o.satisfaction ?? undefined,
          })
        )
      );
      await Promise.all(
        customers.map((c) =>
          updateCustomer(c.id, {
            name: c.name,
            contactName: c.contactName,
            region: c.region,
            level: c.level,
          })
        )
      );
    });
  }, [customers, orders, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>客户跟进与订单状态一并保存。</Hint>
      <h4 style={{ margin: "8px 0", color: "#7dd3fc" }}>客户</h4>
      <Table>
        <thead>
          <tr>
            <th>客户</th>
            <th>地区</th>
            <th>等级</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, idx) => (
            <tr key={c.id}>
              <td>
                <input
                  value={c.name}
                  onChange={(e) => {
                    const next = [...customers];
                    next[idx] = { ...c, name: e.target.value };
                    setCustomers(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={c.region}
                  onChange={(e) => {
                    const next = [...customers];
                    next[idx] = { ...c, region: e.target.value };
                    setCustomers(next);
                  }}
                />
              </td>
              <td>
                <select
                  value={c.level}
                  onChange={(e) => {
                    const next = [...customers];
                    next[idx] = { ...c, level: e.target.value };
                    setCustomers(next);
                  }}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <h4 style={{ margin: "12px 0 8px", color: "#7dd3fc" }}>订单</h4>
      <Table>
        <thead>
          <tr>
            <th>单号</th>
            <th>状态</th>
            <th>金额</th>
            <th>满意度(1-5)</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => (
            <tr key={o.id}>
              <td>{o.orderNo}</td>
              <td>
                <select
                  value={o.status}
                  onChange={(e) => {
                    const next = [...orders];
                    next[idx] = { ...o, status: e.target.value };
                    setOrders(next);
                  }}>
                  {["DRAFT", "CONFIRMED", "SHIPPING", "DONE", "CANCELLED"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  value={o.totalAmount}
                  onChange={(e) => {
                    const next = [...orders];
                    next[idx] = {
                      ...o,
                      totalAmount: Number(e.target.value),
                    };
                    setOrders(next);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={o.satisfaction ?? 5}
                  onChange={(e) => {
                    const next = [...orders];
                    next[idx] = {
                      ...o,
                      satisfaction: Number(e.target.value),
                    };
                    setOrders(next);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function FinanceMonthlyEditor({ registerSave }: EditorProps) {
  const [months, setMonths] = useState<string[]>([]);
  const [revenue, setRevenue] = useState<number[]>([]);
  const [profit, setProfit] = useState<number[]>([]);

  useEffect(() => {
    fetchFinanceSummary().then((s) => {
      setMonths(s.months);
      setRevenue(s.revenue);
      setProfit(s.profit);
    });
  }, []);

  useEffect(() => {
    registerSave(async () => {
      for (let i = 0; i < months.length; i++) {
        await updateFinanceMonth({
          yearMonth: months[i],
          revenue: revenue[i],
          profit: profit[i],
        });
      }
    });
  }, [months, revenue, profit, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th>月份</th>
            <th>收入</th>
            <th>利润</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, idx) => (
            <tr key={m}>
              <td>{m}</td>
              <td>
                <input
                  type="number"
                  value={revenue[idx]}
                  onChange={(e) => {
                    const next = [...revenue];
                    next[idx] = Number(e.target.value);
                    setRevenue(next);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={profit[idx]}
                  onChange={(e) => {
                    const next = [...profit];
                    next[idx] = Number(e.target.value);
                    setProfit(next);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function AdminUsersEditor({ registerSave }: EditorProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [draft, setDraft] = useState({
    username: "",
    phone: "",
    displayName: "",
    password: "123456",
    roleId: 3,
  });

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRoles()]).then(([u, r]) => {
      setUsers(u);
      setRoles(r);
      if (r.length > 0) {
        setDraft((d) => ({ ...d, roleId: r.find((x) => x.id === 3)?.id ?? r[0].id }));
      }
    });
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        users.map((u) =>
          updateUser(u.id, {
            displayName: u.displayName,
            status: u.status,
            roleId: u.roleId,
            phone: u.phone,
          })
        )
      );
    });
  }, [users, registerSave]);

  const addUser = async () => {
    if (!draft.username.trim() || !draft.displayName.trim()) {
      alert("请填写用户名和姓名");
      return;
    }
    const created = await createUser({
      username: draft.username.trim(),
      displayName: draft.displayName.trim(),
      phone: draft.phone.trim() || undefined,
      password: draft.password || "123456",
      roleId: draft.roleId,
    });
    setUsers((prev) => [...prev, created]);
    setDraft({
      username: "",
      phone: "",
      displayName: "",
      password: "123456",
      roleId: draft.roleId,
    });
  };

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th colSpan={6}>新增用户（仅系统管理员）</th>
          </tr>
          <tr>
            <th>用户名</th>
            <th>手机号</th>
            <th>姓名</th>
            <th>初始密码</th>
            <th>角色</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                placeholder="登录用户名"
              />
            </td>
            <td>
              <input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, "") })}
                placeholder="11 位手机号"
                maxLength={11}
              />
            </td>
            <td>
              <input
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                placeholder="显示名称"
              />
            </td>
            <td>
              <input
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </td>
            <td>
              <select
                value={draft.roleId}
                onChange={(e) => setDraft({ ...draft, roleId: Number(e.target.value) })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <MiniBtn type="button" onClick={() => void addUser()}>
                添加
              </MiniBtn>
            </td>
          </tr>
        </tbody>
      </Table>

      <Table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>用户名</th>
            <th>手机号</th>
            <th>姓名</th>
            <th>角色</th>
            <th>状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>
                <input
                  value={u.phone ?? ""}
                  onChange={(e) => {
                    const next = [...users];
                    next[idx] = { ...u, phone: e.target.value.replace(/\D/g, "") };
                    setUsers(next);
                  }}
                  placeholder="手机号"
                  maxLength={11}
                />
              </td>
              <td>
                <input
                  value={u.displayName}
                  onChange={(e) => {
                    const next = [...users];
                    next[idx] = { ...u, displayName: e.target.value };
                    setUsers(next);
                  }}
                />
              </td>
              <td>
                <select
                  value={u.roleId}
                  onChange={(e) => {
                    const roleId = Number(e.target.value);
                    const role = roles.find((r) => r.id === roleId);
                    const next = [...users];
                    next[idx] = {
                      ...u,
                      roleId,
                      roleName: role?.name ?? u.roleName,
                    };
                    setUsers(next);
                  }}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={u.status}
                  onChange={(e) => {
                    const next = [...users];
                    next[idx] = { ...u, status: e.target.value };
                    setUsers(next);
                  }}>
                  {USER_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <MiniBtn
                  type="button"
                  onClick={async () => {
                    const pwd = window.prompt(
                      `为「${u.displayName || u.username}」设置新密码（至少 6 位）`
                    );
                    if (pwd == null) return;
                    if (pwd.length < 6) {
                      alert("密码至少 6 位");
                      return;
                    }
                    const again = window.prompt("请再次输入新密码以确认");
                    if (again == null) return;
                    if (again !== pwd) {
                      alert("两次输入的密码不一致");
                      return;
                    }
                    await resetUserPassword(u.id, pwd);
                    alert("密码已重置");
                  }}>
                  重置密码
                </MiniBtn>
                <MiniBtn
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`确定删除用户「${u.displayName}」？`)) return;
                    await deleteUser(u.id);
                    setUsers((prev) => prev.filter((row) => row.id !== u.id));
                  }}>
                  删除
                </MiniBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function AdminRolesEditor({ registerSave }: EditorProps) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  useEffect(() => {
    fetchRoles().then(setRoles);
  }, []);
  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        roles.map((r) =>
          updateRole(r.id, { name: r.name, permissions: r.permissions })
        )
      );
    });
  }, [roles, registerSave]);
  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th>角色</th>
            <th>权限说明</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r, idx) => (
            <tr key={r.id}>
              <td>
                <input
                  value={r.name}
                  onChange={(e) => {
                    const next = [...roles];
                    next[idx] = { ...r, name: e.target.value };
                    setRoles(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={r.permissions}
                  onChange={(e) => {
                    const next = [...roles];
                    next[idx] = { ...r, permissions: e.target.value };
                    setRoles(next);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function AdminCategoriesEditor({ registerSave }: EditorProps) {
  const [rows, setRows] = useState<SkuRow[]>([]);
  const [draft, setDraft] = useState({ variety: "", specification: "" });

  const reload = () => fetchSkus().then(setRows);

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        rows.map((r) =>
          updateSku(r.id, {
            variety: r.variety,
            specification: r.specification,
          })
        )
      );
    });
  }, [rows, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th colSpan={4}>新增品种规格</th>
          </tr>
          <tr>
            <th>品种</th>
            <th>规格</th>
            <th>关联品类</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                value={draft.variety}
                onChange={(e) => setDraft({ ...draft, variety: e.target.value })}
                placeholder="国槐"
              />
            </td>
            <td>
              <input
                value={draft.specification}
                onChange={(e) =>
                  setDraft({ ...draft, specification: e.target.value })
                }
                placeholder="胸径8cm"
              />
            </td>
            <td>—</td>
            <td>
              <MiniBtn
                type="button"
                onClick={async () => {
                  if (!draft.variety.trim() || !draft.specification.trim()) return;
                  await createSku({
                    variety: draft.variety.trim(),
                    specification: draft.specification.trim(),
                  });
                  setDraft({ variety: "", specification: "" });
                  await reload();
                }}>
                添加
              </MiniBtn>
            </td>
          </tr>
        </tbody>
      </Table>

      <Table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>品种</th>
            <th>规格</th>
            <th>关联品类</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td>
                <input
                  value={r.variety}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, variety: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={r.specification}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, specification: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>{r.categoryName || "—"}</td>
              <td>
                <MiniBtn
                  type="button"
                  onClick={async () => {
                    await deleteSku(r.id);
                    await reload();
                  }}>
                  删
                </MiniBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Form>
  );
}

function AdminCustomersEditor({ registerSave }: EditorProps) {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [draft, setDraft] = useState({
    name: "",
    contactName: "",
    region: "",
    level: "B",
  });

  useEffect(() => {
    fetchCustomers().then(setRows);
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await Promise.all(
        rows.map((c) =>
          updateCustomer(c.id, {
            name: c.name,
            contactName: c.contactName,
            region: c.region,
            level: c.level,
          })
        )
      );
    });
  }, [rows, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Table>
        <thead>
          <tr>
            <th>客户</th>
            <th>联系人</th>
            <th>地区</th>
            <th>等级</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c, idx) => (
            <tr key={c.id}>
              <td>
                <input
                  value={c.name}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...c, name: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={c.contactName}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...c, contactName: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  value={c.region}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...c, region: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <select
                  value={c.level}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...c, level: e.target.value };
                    setRows(next);
                  }}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </td>
              <td>
                <MiniBtn
                  type="button"
                  onClick={async () => {
                    await deleteCustomer(c.id);
                    setRows((prev) => prev.filter((x) => x.id !== c.id));
                  }}>
                  删
                </MiniBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Row>
        <Field>
          <span>新客户</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <MiniBtn
          type="button"
          style={{ alignSelf: "end" }}
          onClick={async () => {
            if (!draft.name.trim()) return;
            const created = await createCustomer(draft);
            setRows((prev) => [...prev, created]);
            setDraft({ name: "", contactName: "", region: "", level: "B" });
          }}>
          新增客户
        </MiniBtn>
      </Row>
    </Form>
  );
}

function FinanceChart1Editor({ registerSave }: EditorProps) {
  const [asset, setAsset] = useState(0);
  const [cfg, setCfg] = useState(defaultAssetExtra);
  const c = cfg;

  useEffect(() => {
    fetchFinanceSummary().then((s) => {
      setAsset(s.assetValue);
      setCfg({
        growthRates: s.growthRates ?? defaultAssetExtra().growthRates,
        pieItems: s.pieItems ?? defaultAssetExtra().pieItems,
      });
    });
  }, []);

  useEffect(() => {
    registerSave(async () => {
      await updateFinanceSettings({
        assetValue: asset,
        growthRates: c.growthRates,
        pieItems: c.pieItems,
      });
    });
  }, [asset, c, registerSave]);

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Hint>
        编辑全省资产汇总。点击地图选中地市后，季度占比与增长率切换为各地市预设数据（finance_city_profile）。
      </Hint>
      <Field>
        <span>资产总值（元）</span>
        <input
          type="number"
          value={asset}
          onChange={(e) => setAsset(Number(e.target.value))}
        />
      </Field>
      <Field>
        <span>增长率条（逗号分隔 %）</span>
        <input
          value={c.growthRates.join(",")}
          onChange={(e) =>
            setCfg({ ...c, growthRates: csvNums(e.target.value) })
          }
        />
      </Field>
      <Field>
        <span>季度占比（名称,数值 每行）</span>
        <textarea
          value={c.pieItems.map((i) => `${i.name},${i.value}`).join("\n")}
          onChange={(e) => {
            const pieItems = e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, val] = line.split(/[,，]/);
                return { name: name?.trim() || "", value: Number(val) || 0 };
              });
            setCfg({ ...c, pieItems });
          }}
        />
      </Field>
    </Form>
  );
}

function AdminKpiHint({ registerSave }: { registerSave: (fn: () => Promise<void>) => void }) {
  useEffect(() => {
    registerSave(async () => {});
  }, [registerSave]);
  return (
    <Hint>
      KPI 由用户、角色、品种规格、客户等后台数据自动汇总。请编辑左侧对应管理表格，保存后 KPI
      环图会自动更新。
    </Hint>
  );
}

export function PanelEditorForm({
  editorType,
  panelKey,
  editorContext,
  registerSave,
}: {
  editorType: PanelEditorType;
  panelKey?: string;
  editorContext?: Record<string, unknown>;
  onSaved?: () => void;
  registerSave: (fn: () => Promise<void>) => void;
}) {
  const props = { panelKey, editorContext, registerSave };

  switch (editorType) {
    case "chart-dual-line":
      return <DualLineEditor {...props} />;
    case "chart-inv-province":
      return <InvProvinceTrendEditor {...props} />;
    case "chart-inv-city":
      return <InvCityTrendEditor {...props} />;
    case "chart-io":
      return <IoEditor {...props} />;
    case "chart-bar":
      return <BarEditor {...props} />;
    case "chart-pie":
      return <PieEditor {...props} />;
    case "chart-rank":
      return <RankEditor {...props} />;
    case "chart-revenue":
      return <RevenueEditor {...props} />;
    case "chart-stats":
      return <StatsEditor {...props} />;
    case "chart-radar":
      return <RadarEditor {...props} />;
    case "chart-asset-extra":
      return <AssetExtraEditor {...props} />;
    case "api-inventory":
      return <InventoryEditor {...props} />;
    case "api-sales":
      return <SalesEditor {...props} />;
    case "api-finance-monthly":
      return <FinanceMonthlyEditor {...props} />;
    case "api-finance-chart1":
      return <FinanceChart1Editor {...props} />;
    case "api-finance-trend-province":
      return <FinProvinceTrendApiEditor {...props} />;
    case "api-finance-trend-city":
      return <FinCityTrendApiEditor {...props} />;
    case "api-finance-asset-stats":
      return <FinanceAssetStatsEditor {...props} />;
    case "api-finance-asset-hint":
      return (
        <FinanceReadonlyHint registerSave={props.registerSave}>
          全省资产分布为各地市 nursery_asset_stat 汇总。请点击地图选择地市后编辑。
        </FinanceReadonlyHint>
      );
    case "api-finance-sales-hint":
      return (
        <FinanceReadonlyHint registerSave={props.registerSave}>
          全省视图显示各地市 TOP5；点击地图选中某市后，显示该市下辖 5 个区县销售额。数据来自 finance_sales_district 表，可运行 php scripts/reseed-finance.php 重置。
        </FinanceReadonlyHint>
      );
    case "api-admin-users":
      return <AdminUsersEditor {...props} />;
    case "api-admin-roles":
      return <AdminRolesEditor {...props} />;
    case "api-admin-categories":
      return <AdminCategoriesEditor {...props} />;
    case "api-admin-customers":
      return <AdminCustomersEditor {...props} />;
    case "api-admin-kpi":
      return <AdminKpiHint registerSave={registerSave} />;
    default:
      return <Hint>暂无编辑器</Hint>;
  }
}
