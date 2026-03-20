import postgres from 'postgres';
const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const schema = await sql`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'blastMetrics'
  ORDER BY ordinal_position
`;
console.table(schema);

// Check if sequence exists
const seq = await sql`
  SELECT pg_get_serial_sequence('"blastMetrics"', 'id') as sequence
`;
console.log('Sequence:', seq);

await sql.end();
