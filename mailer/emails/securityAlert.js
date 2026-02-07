import { renderTemplate } from "../renderTemplate.js";

export function securityAlertEmail() {
  return renderTemplate(`
    <h2>Security Alert</h2>
    <p>A new login was detected on your account.</p>
    <p>If this was not you, reset your password immediately.</p>

    <a class="btn" href="https://cryptodigitalpro.com/reset-password">
      Secure Account
    </a>
  `);
}
