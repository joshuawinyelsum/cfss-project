import { api } from "./api";

export async function downloadExport(endpoint: string, filename: string, token: string) {
  try {
    const isBrowser = typeof window !== "undefined";
    const apiHost = isBrowser ? window.location.hostname : "127.0.0.1";
    const url = endpoint.startsWith('http') ? endpoint : `http://${apiHost}:8000${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Export failed with status: ${response.status}`);
    }

    let finalFilename = filename;
    const disposition = response.headers.get("content-disposition");
    if (disposition && disposition.indexOf("attachment") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        finalFilename = matches[1].replace(/['"]/g, "");
      }
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", finalFilename);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Export failed:", error);
    throw new Error("Export failed. Check server.");
  }
}
