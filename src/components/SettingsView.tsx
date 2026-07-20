import { type RefObject, useRef, useState } from "react";
import { Save } from "lucide-react";
import { FiscalSettings, FiscalSettingsHandle } from "./settings/FiscalSettings";
import { InventorySettings } from "./settings/InventorySettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { OperationFolioSettings, OperationFolioSettingsHandle } from "./settings/OperationFolioSettings";
import { SettingsLayout, SettingsTab } from "./settings/SettingsLayout";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("fiscal");
  const operationSettingsRef = useRef<OperationFolioSettingsHandle>(null);
  const fiscalSettingsRef = useRef<FiscalSettingsHandle>(null);

  return (
    <SettingsLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={activeTab === "fiscal" ? (
        <>
          <button onClick={() => fiscalSettingsRef.current?.discard()} className="px-4 py-2.5 border border-border-table hover:bg-white/5 text-zinc-300 rounded-md text-sm font-medium transition-colors">
            Descartar cambios
          </button>
          <button onClick={() => fiscalSettingsRef.current?.save()} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors">
            <Save className="w-4 h-4" /> Guardar
          </button>
        </>
      ) : activeTab === "operation" ? (
        <>
          <button onClick={() => operationSettingsRef.current?.discard()} className="px-4 py-2.5 border border-border-table hover:bg-white/5 text-zinc-300 rounded-md text-sm font-medium transition-colors">
            Descartar cambios
          </button>
          <button onClick={() => operationSettingsRef.current?.save()} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-bold transition-colors">
            <Save className="w-4 h-4" /> Guardar
          </button>
        </>
      ) : undefined}
    >
      <SettingsPanel activeTab={activeTab} operationSettingsRef={operationSettingsRef} fiscalSettingsRef={fiscalSettingsRef} />
    </SettingsLayout>
  );
}

function SettingsPanel({ activeTab, operationSettingsRef, fiscalSettingsRef }: { activeTab: SettingsTab; operationSettingsRef: RefObject<OperationFolioSettingsHandle | null>; fiscalSettingsRef: RefObject<FiscalSettingsHandle | null> }) {
  switch (activeTab) {
    case "fiscal":
      return <FiscalSettings ref={fiscalSettingsRef} />;
    case "operation":
      return <OperationFolioSettings ref={operationSettingsRef} />;
    case "notifications":
      return <NotificationSettings />;
    case "inventory":
    default:
      return <InventorySettings />;
  }
}
