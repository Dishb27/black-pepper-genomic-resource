// pages/api/databases.js
export default async function handler(req, res) {
  try {
    const backendUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8080/databases"
        : "http://107.23.207.191:8080/databases";

    console.log("Proxying request to:", backendUrl);

    const response = await fetch(backendUrl);
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch databases" });
  }
}
