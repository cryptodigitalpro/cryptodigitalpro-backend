import pkg from "pg";
const { Pool } = pkg;

export const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cryptodigitalpro",
  password: "Oluwablessme@26",
  port: 5432,
  ssl: false
});

// optional helper (matches your old usage)
export const query = (text, params) => db.query(text, params);
