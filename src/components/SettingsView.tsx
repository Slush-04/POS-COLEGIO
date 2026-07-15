import { useState } from "react";
import { FiscalSettings } from "./settings/FiscalSettings";
import { IdentitySettings } from "./settings/IdentitySettings";
import { InventorySettings } from "./settings/InventorySettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { OperationFolioSettings } from "./settings/OperationFolioSettings";
import { SettingsLayout, SettingsTab } from "./settings/SettingsLayout";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("identity");

  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <SettingsPanel activeTab={activeTab} />
    </SettingsLayout>
  );
}

function SettingsPanel({ activeTab }: { activeTab: SettingsTab }) {
  switch (activeTab) {
    case "fiscal":
      return <FiscalSettings />;
    case "operation":
      return <OperationFolioSettings />;
    case "notifications":
      return <NotificationSettings />;
    case "inventory":
      return <InventorySettings />;
    case "identity":
    default:
      return <IdentitySettings />;
  }
}
