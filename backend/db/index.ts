import { SQLDatabase } from "encore.dev/storage/sqldb";

export default new SQLDatabase("thesisflow_db", {
  migrations: "./migrations",
});
