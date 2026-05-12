import type { Certification } from "@/types";
import { createCertification, updateCertification, deleteCertification } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createCertificationHandlers(
  loadData: LoadDataFn,
  confirm: (opts: { message: string; description?: string } | string) => Promise<boolean>,
) {
  const handleAddCertification = async (certForm: Omit<Certification, "$id" | "$createdAt">) => {
    try {
      await createCertification(certForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add certification:", err);
      throw err;
    }
  };

  const handleUpdateCertification = async (
    certId: string,
    certForm: Partial<Omit<Certification, "$id" | "$createdAt">>,
  ) => {
    try {
      await updateCertification(certId, certForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update certification:", err);
      throw err;
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    const ok = await confirm({
      message: "Delete certification?",
      description: "This will permanently remove the certification.",
    });
    if (!ok) return;
    try {
      await deleteCertification(certId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete certification:", err);
      throw err;
    }
  };

  return {
    handleAddCertification,
    handleUpdateCertification,
    handleDeleteCertification,
  };
}
