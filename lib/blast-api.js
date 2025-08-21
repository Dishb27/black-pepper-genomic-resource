// lib/blast-api.js
export const runBlast = async (blastData) => {
  const response = await fetch("/api/blast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(blastData),
  });

  if (!response.ok) {
    throw new Error(`BLAST request failed: ${response.status}`);
  }

  return response.json();
};

export const getDatabases = async () => {
  const response = await fetch("/api/databases");

  if (!response.ok) {
    throw new Error(`Database fetch failed: ${response.status}`);
  }

  return response.json();
};
