const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function readEnvironmentValue(uppercaseName, lowercaseName) {
  return process.env[uppercaseName] || process.env[lowercaseName] || "";
}

export function isBrevoConfigured() {
  return Boolean(
    readEnvironmentValue("BREVO_API_KEY", "brevo_api_key") &&
      readEnvironmentValue("BREVO_SENDER_EMAIL", "brevo_sender_email") &&
      readEnvironmentValue("BREVO_SENDER_NAME", "brevo_sender_name"),
  );
}

export async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
  const apiKey = readEnvironmentValue("BREVO_API_KEY", "brevo_api_key");
  const senderEmail = readEnvironmentValue("BREVO_SENDER_EMAIL", "brevo_sender_email");
  const senderName = readEnvironmentValue("BREVO_SENDER_NAME", "brevo_sender_name");

  if (!apiKey || !senderEmail || !senderName) {
    throw new Error("Brevo email delivery is not configured.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Brevo rejected the email request (${response.status}): ${responseBody.slice(0, 500)}`);
  }
}
