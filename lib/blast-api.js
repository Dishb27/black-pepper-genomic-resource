const getApiBaseUrl = () => {
  // Development: use local tunnel to EC2
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8080";
  }
  // Production: use direct EC2 IP (via Vercel env var)
  return process.env.NEXT_PUBLIC_BLAST_API_PROD;
};

export const runBlast = async (blastData) => {
  const response = await fetch(`${getApiBaseUrl()}/blast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(blastData),
  });
  return response.json();
};

export const getDatabases = async () => {
  const response = await fetch(`${getApiBaseUrl()}/databases`);
  return response.json();
};
