import AllOrdersTable from "@/components/AllOrdersTable";
import NavigablePanel from "@/components/NavigablePanel";
import { useConfigStore } from "../stores";
import ChartFill from "./chartFill";

export default function Chart3({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);

  return (
    <ChartFill>
      <NavigablePanel to="/orders" hint="查看全部" style={{ height: "100%" }}>
        <AllOrdersTable
          city={selectedCity}
          refreshToken={refreshToken}
          theme="fin"
          mode="preview"
        />
      </NavigablePanel>
    </ChartFill>
  );
}
