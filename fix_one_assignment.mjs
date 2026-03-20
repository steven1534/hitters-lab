import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require', prepare: false,
});

await sql`
  INSERT INTO "drillAssignments" (id, "userId", "inviteId", "drillId", "drillName", status, notes, "assignedAt", "completedAt", "updatedAt")
  VALUES (900003, 6780032, null, 'one-handed-hitting', 'One-Handed Hitting', 'assigned', null, '2026-02-15 17:21:00', null, '2026-02-15 17:21:00')
  ON CONFLICT (id) DO NOTHING
`;

await sql.end();
console.log('Fixed row 900003 inserted.');
