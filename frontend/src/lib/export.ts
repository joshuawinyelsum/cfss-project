import { api } from "./api";

export async function downloadExport(endpoint: string, filename: string, token: string) {
  try {
    const url = endpoint.startsWith('http') ? endpoint : endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    console.log("Exporting from URL via Axios:", url);
    
    const response = await api.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'blob' // Important for downloading files!
    });

    let finalFilename = filename;
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.indexOf("attachment") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        finalFilename = matches[1].replace(/['"]/g, "");
      }
    }

    const blob = response.data;
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", finalFilename);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Export failed:", error);
    if (error.response) {
      console.error("Backend error response:", error.response.data);
      throw new Error(`Export failed: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error("Export failed. Check server.");
  }
}
