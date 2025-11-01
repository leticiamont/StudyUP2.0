const BASE_URL = "http://localhost:3000";

export async function post(endpoint, data) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  return await response.json();
}
