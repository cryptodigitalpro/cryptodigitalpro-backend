import { renderTemplate } from "../renderTemplate.js";

export function withdrawStatusEmail(status) {
  return renderTemplate(`
    <h2>Withdrawal Update</h2>
    <p>Your withdrawal status has changed.</p>
    <p><b>Current status:</b> ${status}</p>

    <a class="btn" href="https://cryptodigitalpro.com/dashboard">
      View Details
    </a>
  `);
}
