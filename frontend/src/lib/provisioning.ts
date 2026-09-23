import { api } from "@/lib/api";
import { db } from "@/lib/db";
import { useAuthStore } from "@/lib/store";

export async function executeProvisioning(userId: number, token: string): Promise<boolean> {
  const setStatus = useAuthStore.getState().setProvisioningStatus;
  
  try {
    setStatus(userId, "PROVISIONING_DEVICE");
    
    const types = ["HOUSEHOLD", "EDUCATION", "HEALTH", "GOVERNANCE"];
    const now = new Date().toISOString();
    
    // Pre-fetch all network requests BEFORE starting the transaction
    // This minimizes the transaction lifespan and prevents Dexie transaction aborts
    // which occur if we await network calls inside the transaction.
    
    const definitionsData: { type: string; questions: Record<string, unknown>[] }[] = [];
    for (const type of types) {
      const qRes = await api.get("/api/student/surveys/questions", { 
        params: { type },
        headers: { Authorization: `Bearer ${token}` }
      });
      const { normalizeSurveyType } = await import('@/lib/surveyType');
      definitionsData.push({ type: normalizeSurveyType(type), questions: qRes.data });
    }

    setStatus(userId, "PROVISIONING_DATA");
    
    const downloadRes = await api.get("/api/sync/download", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const serverSurveys = downloadRes.data.surveys || [];
    
    setStatus(userId, "VERIFYING_LOCAL_STATE");
    
    // Now execute the atomic local write
    await db.transaction("rw", db.definitions, db.surveys, async () => {
      // 1. Write definitions
      for (const def of definitionsData) {
        await db.definitions.put({
          type: def.type,
          questions: def.questions,
          updated_at: now
        });
      }
      
      // 2. Identify pending local surveys that should not be overwritten
      const pendingLocal = await db.surveys
        .where("student_id").equals(userId)
        .filter(s => s.sync_status === "pending" || s.sync_status === "syncing" || s.sync_status === "failed")
        .toArray();
        
      const pendingIds = new Set(pendingLocal.map(s => s.id));
      
      // 3. Write server surveys
      for (const s of serverSurveys) {
        if (!pendingIds.has(s.survey_id)) {
           await db.surveys.put({
             id: s.survey_id,
             student_id: userId,
             survey_type: s.survey_type,
             community_id: s.community_id,
             entity_id: s.house_number,
             answers: s.answers,
             status: s.status,
             sync_status: "synced", // Historical server records are fully synced
             created_at: s.created_at || now,
             updated_at: s.updated_at || now,
             submitted_at: s.submitted_at || undefined
           });
        }
      }
    });
    
    setStatus(userId, "PROVISIONED");
    
    // Auto-transition to READY after a brief delay for UI smoothness
    setTimeout(() => {
       setStatus(userId, "READY");
    }, 1500);
    
    return true;
  } catch (err: unknown) {
    console.error("Provisioning failed. Detailed Diagnostic Log:");
    const e = err as { name?: string; message?: string; response?: { status?: number; data?: unknown }; stack?: string };
    console.error("Error name:", e.name);
    console.error("Error message:", e.message);
    if (e.response) {
      console.error("HTTP status:", e.response.status);
      console.error("Response body:", e.response.data);
    }
    console.error("Stack trace:", e.stack);
    console.error("Original error:", err);
    setStatus(userId, "PROVISIONING_FAILED");
    return false;
  }
}
