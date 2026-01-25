export const createTransactionTable = `
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type TEXT,
  amount NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
`;
