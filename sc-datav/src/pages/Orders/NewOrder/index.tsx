import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import styled from "styled-components";
import { createSalesOrder, fetchSalesCustomers, fetchSkuCatalog } from "@/api";
import type { CustomerRow } from "@/api/types";
import { SHAANXI_CITY_DISTRICTS } from "@/data/shaanxiCityDistricts";
import { SHANXI_CITIES } from "@/pages/Inv/constants";
import { useRoleApi } from "@/hooks/useRoleApi";

const PageRoot = styled.div`
  position: fixed;
  inset: 0;
  overflow: auto;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff;
  pointer-events: auto;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 12px;
  border-bottom: 1px solid rgba(186, 206, 255, 0.15);
`;

const Title = styled.h1`
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.65);
`;

const BackLink = styled(Link)`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.12);
  color: #bdcfff;
  text-decoration: none;
  font-size: 13px;

  &:hover {
    background: rgba(48, 97, 219, 0.22);
  }
`;

const FormPanel = styled.div`
  max-width: 640px;
  margin: 24px auto 40px;
  padding: 24px 28px;
  border: 1px solid rgba(48, 97, 219, 0.25);
  border-radius: 8px;
  background: rgba(8, 14, 28, 0.72);
`;

const SectionTitle = styled.div`
  margin: 4px 0 12px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(186, 206, 255, 0.55);
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.85);

  input,
  select {
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid rgba(48, 97, 219, 0.35);
    background: rgba(4, 8, 18, 0.8);
    color: #e8f0ff;
    font-size: 14px;
  }

  input[readonly] {
    background: rgba(4, 8, 18, 0.45);
    color: rgba(186, 230, 253, 0.9);
    cursor: default;
  }

  small {
    font-size: 11px;
    color: rgba(186, 206, 255, 0.45);
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const ModeTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const ModeTab = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(234, 88, 12, 0.65)" : "rgba(48, 97, 219, 0.35)"};
  background: ${({ $active }) =>
    $active ? "rgba(234, 88, 12, 0.22)" : "transparent"};
  color: ${({ $active }) => ($active ? "#ffedd5" : "#bdcfff")};
  font-size: 13px;
  cursor: pointer;
`;

const Hint = styled.p`
  margin: -8px 0 12px;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.5);
`;

const CustomerSummary = styled.div`
  margin: -4px 0 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.25);
  background: rgba(14, 116, 144, 0.15);
  font-size: 13px;
  color: rgba(186, 230, 253, 0.9);
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const PrimaryBtn = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #ea580c, #ff9100);
  color: #fff;
  font-size: 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryBtn = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: transparent;
  color: #bdcfff;
  font-size: 14px;
  cursor: pointer;
`;

const Message = styled.p<{ $error?: boolean }>`
  margin: 0 0 12px;
  font-size: 13px;
  color: ${({ $error }) => ($error ? "#fca5a5" : "#86efac")};
`;

type CustomerMode = "existing" | "manual";

function customerMatchesFilter(
  customer: CustomerRow,
  city: string,
  district: string
) {
  if (city && customer.region && customer.region !== city) return false;
  if (district && customer.district && customer.district !== district) return false;
  return true;
}

export default function NewOrderPage() {
  const { profile } = useRoleApi();
  const navigate = useNavigate();
  const operatorLabel = profile?.roleCode === "ADMIN" ? "管理员昵称" : "销售员昵称";
  const operatorName = profile
    ? profile.displayName?.trim() || profile.username || "—"
    : "—";

  const [filterCity, setFilterCity] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [customerMode, setCustomerMode] = useState<CustomerMode>("manual");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCity, setManualCity] = useState<string>(SHANXI_CITIES[0]);
  const [manualDistrict, setManualDistrict] = useState("");
  const [variety, setVariety] = useState("");
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [totalAmount, setTotalAmount] = useState("5000");
  const [catalog, setCatalog] = useState<{
    varieties: string[];
    specificationsByVariety: Record<string, string[]>;
  }>({
    varieties: [],
    specificationsByVariety: {},
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    fetchSkuCatalog()
      .then((c) => {
        setCatalog(c);
        if (c.varieties[0]) {
          setVariety(c.varieties[0]);
          setSpecification(c.specificationsByVariety[c.varieties[0]]?.[0] ?? "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (customerMode !== "existing") return;
    setCustomersLoading(true);
    fetchSalesCustomers({
      city: filterCity || undefined,
      district: filterDistrict || undefined,
    })
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  }, [customerMode, filterCity, filterDistrict]);

  const filterDistricts = useMemo(
    () =>
      filterCity
        ? SHAANXI_CITY_DISTRICTS[filterCity as keyof typeof SHAANXI_CITY_DISTRICTS] ?? []
        : [],
    [filterCity]
  );

  const manualDistricts = useMemo(
    () =>
      SHAANXI_CITY_DISTRICTS[manualCity as keyof typeof SHAANXI_CITY_DISTRICTS] ?? [],
    [manualCity]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const specs = catalog.specificationsByVariety[variety] ?? [];

  function switchMode(mode: CustomerMode) {
    setCustomerMode(mode);
    setMessage("");
    setError(false);
    if (mode === "manual") {
      setSelectedCustomerId("");
      setCustomerSearch("");
    } else {
      setManualCustomerName("");
    }
  }

  function onFilterCityChange(nextCity: string) {
    setFilterCity(nextCity);
    setFilterDistrict("");
    if (selectedCustomerId !== "") {
      const current = customers.find((c) => c.id === selectedCustomerId);
      if (current && !customerMatchesFilter(current, nextCity, "")) {
        setSelectedCustomerId("");
      }
    }
  }

  function onFilterDistrictChange(nextDistrict: string) {
    setFilterDistrict(nextDistrict);
    if (selectedCustomerId !== "") {
      const current = customers.find((c) => c.id === selectedCustomerId);
      if (
        current &&
        !customerMatchesFilter(current, filterCity, nextDistrict)
      ) {
        setSelectedCustomerId("");
      }
    }
  }

  async function onSubmit(e: FormEvent, goPending: boolean) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const payload =
        customerMode === "existing"
          ? {
              customerId: Number(selectedCustomerId),
              city: filterCity || selectedCustomer?.region || undefined,
              district: filterDistrict || selectedCustomer?.district || undefined,
              variety,
              specification,
              quantity: Number(quantity),
              totalAmount: Number(totalAmount),
            }
          : {
              customerName: manualCustomerName.trim(),
              city: manualCity,
              district: manualDistrict || undefined,
              variety,
              specification,
              quantity: Number(quantity),
              totalAmount: Number(totalAmount),
            };

      if (customerMode === "existing" && !selectedCustomerId) {
        throw new ApiError("请选择已有客户，或切换到手动添加");
      }
      if (customerMode === "manual" && !manualCustomerName.trim()) {
        throw new ApiError("请填写新客户名称");
      }

      const order = await createSalesOrder(payload);
      setMessage(`订单 ${order.orderNo} 已创建（草稿），请在待处理中提交审核。`);
      if (goPending) {
        navigate("/orders/pending");
      }
    } catch (err) {
      setError(true);
      setMessage(err instanceof ApiError ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageRoot>
      <Header>
        <div>
          <Title>新建销售订单</Title>
          <Subtitle>全站共享：各角色可见全部订单；下方为当前登录用户姓名（非账号）</Subtitle>
        </div>
        <BackLink to="/home">返回首页</BackLink>
      </Header>
      <FormPanel>
        {message ? <Message $error={error}>{message}</Message> : null}
        <form onSubmit={(e) => onSubmit(e, false)}>
          <SectionTitle>经办信息</SectionTitle>
          <Field>
            {operatorLabel}
            <input readOnly value={operatorName} tabIndex={-1} aria-readonly />
            <small>
              当前登录姓名（非账号）。若显示异常，请到
              <Link to="/profile/info" style={{ color: "#93c5fd", marginLeft: 4 }}>
                个人中心
              </Link>
              修改姓名
            </small>
          </Field>

          <ModeTabs>
            <ModeTab
              type="button"
              $active={customerMode === "existing"}
              onClick={() => switchMode("existing")}>
              选择已有客户
            </ModeTab>
            <ModeTab
              type="button"
              $active={customerMode === "manual"}
              onClick={() => switchMode("manual")}>
              手动添加客户
            </ModeTab>
          </ModeTabs>

          {customerMode === "existing" ? (
            <>
              <SectionTitle>筛选客户（地市 · 区县）</SectionTitle>
              <Row>
                <Field>
                  地市
                  <select
                    value={filterCity}
                    onChange={(e) => onFilterCityChange(e.target.value)}>
                    <option value="">全部地市</option>
                    {SHANXI_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  区县
                  <select
                    value={filterDistrict}
                    disabled={!filterCity}
                    onChange={(e) => onFilterDistrictChange(e.target.value)}>
                    <option value="">
                      {filterCity ? "全部区县" : "请先选择地市"}
                    </option>
                    {filterDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
              </Row>
              <Hint>
                筛选仅作用于下方客户列表，与手动添加模式互不干扰。
              </Hint>
              <Field>
                搜索客户
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="输入客户名称关键字"
                />
              </Field>
              <Field>
                客户
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) =>
                    setSelectedCustomerId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }>
                  <option value="">
                    {customersLoading
                      ? "加载中…"
                      : filteredCustomers.length
                        ? "请选择客户"
                        : "当前筛选下暂无客户，请调整筛选或手动添加"}
                  </option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.region ? ` · ${c.region}` : ""}
                      {c.district ? ` · ${c.district}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedCustomer ? (
                <CustomerSummary>
                  已选：{selectedCustomer.name}
                  {selectedCustomer.region ? ` · ${selectedCustomer.region}` : ""}
                  {selectedCustomer.district ? ` · ${selectedCustomer.district}` : ""}
                  {selectedCustomer.contactName
                    ? ` · 联系人 ${selectedCustomer.contactName}`
                    : ""}
                </CustomerSummary>
              ) : null}
            </>
          ) : (
            <>
              <SectionTitle>新客户信息</SectionTitle>
              <Field>
                客户名称
                <input
                  required
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  placeholder="例：某某园林公司"
                />
              </Field>
              <Row>
                <Field>
                  地市
                  <select
                    value={manualCity}
                    onChange={(e) => {
                      setManualCity(e.target.value);
                      setManualDistrict("");
                    }}>
                    {SHANXI_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  区县
                  <select
                    value={manualDistrict}
                    onChange={(e) => setManualDistrict(e.target.value)}>
                    <option value="">— 可选 —</option>
                    {manualDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
              </Row>
            </>
          )}

          <SectionTitle>订单明细</SectionTitle>
          <Row>
            <Field>
              品种
              <select
                value={variety}
                onChange={(e) => {
                  setVariety(e.target.value);
                  const first =
                    catalog.specificationsByVariety[e.target.value]?.[0] ?? "";
                  setSpecification(first);
                }}>
                {catalog.varieties.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              规格
              <select
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}>
                {specs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field>
              数量（株）
              <input
                required
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
            <Field>
              订单金额（元）
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </Field>
          </Row>
          <Actions>
            <PrimaryBtn
              type="button"
              disabled={loading}
              onClick={(e) => onSubmit(e as unknown as FormEvent, true)}>
              {loading ? "提交中…" : "保存并去待办"}
            </PrimaryBtn>
            <SecondaryBtn type="submit" disabled={loading}>
              仅保存草稿
            </SecondaryBtn>
          </Actions>
        </form>
      </FormPanel>
    </PageRoot>
  );
}
