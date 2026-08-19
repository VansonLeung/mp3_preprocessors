import { ConfigProvider } from "antd";
import { ResourceNavigatorLayout } from "./components/ResourceNavigatorLayout";

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 6,
          colorPrimary: "#1f6feb",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Card: {
            headerHeight: 40,
          },
        },
      }}
    >
      <ResourceNavigatorLayout />
    </ConfigProvider>
  );
}
