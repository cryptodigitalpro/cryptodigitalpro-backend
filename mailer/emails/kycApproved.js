import { renderTemplate } from "../renderTemplate.js";

export function kycApprovedEmail() {
  return renderTemplate(`
    <h2>KYC Approved ✅</h2>
    <p>Your identity verification has been successfully approved.</p>
    <p>You can now withdraw funds without restrictions.</p>

    <a class="btn" href="https://cryptodigitalpro.com/dashboard">
      Open Dashboard
    </a>
  `);
}
