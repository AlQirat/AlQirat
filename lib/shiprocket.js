const defaultBaseUrl = "https://apiv2.shiprocket.in/v1/external";

function getConfig() {
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  const baseUrl = (process.env.SHIPROCKET_API_BASE_URL || defaultBaseUrl).replace(/\/$/, "");
  if (!email || !password || !pickupLocation) throw new Error("Shiprocket credentials and pickup location are not configured.");
  return { email, password, pickupLocation, baseUrl };
}

async function request(baseUrl, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }
  if (!response.ok) {
    const message = getShiprocketMessage(result) || `Shiprocket request failed with status ${response.status}.`;
    throw new Error(String(message));
  }
  return result;
}

export async function getShiprocketToken() {
  const { email, password, baseUrl } = getConfig();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }
  if (!response.ok || !result.token) throw new Error(result?.message || `Shiprocket authentication failed with status ${response.status}.`);
  return { token: result.token, baseUrl };
}

export function getShiprocketPickupLocation() {
  return getConfig().pickupLocation;
}

export function createShiprocketOrder(token, baseUrl, payload) {
  return request(baseUrl, "/orders/create/adhoc", token, payload);
}

export function assignShiprocketAwb(token, baseUrl, shipmentId) {
  return request(baseUrl, "/courier/assign/awb", token, { shipment_id: Number(shipmentId) });
}

export function extractShiprocketValue(result, key) {
  const sources = [result, result?.data, result?.payload, result?.payload?.data, result?.response, result?.response?.data, result?.response?.payload, result?.response?.payload?.data];
  for (const source of sources) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function getShiprocketMessage(result) {
  const sources = [result, result?.data, result?.payload, result?.response, result?.response?.data, result?.response?.payload];
  for (const source of sources) {
    const value = source?.message || source?.error || (Array.isArray(source?.errors) ? source.errors[0] : null);
    if (value) return String(value);
  }
  return "";
}
