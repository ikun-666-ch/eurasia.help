import AllOrdersTable from "@/components/AllOrdersTable";
import { useConfigStore } from "../stores";

export default function Chart3({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);

  return (
    <AllOrdersTable
      city={selectedCity}
      refreshToken={refreshToken}
      theme="sal"
      mode="preview"
    />
  );
}
