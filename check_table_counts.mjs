import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require', prepare: false,
});

const tables = [
  'users','drillDetails','drillVideos','drillStatCards','drillCustomizations',
  'drillAssignments','drillFavorites','drillSubmissions','drillAnswers',
  'drillQuestions','invites','sessionNotes','badges','blastMetrics',
  'blastSessions','blastPlayers','coachNotes','coachFeedback','notifications',
  'practicePlans','progressReports','athleteProfiles','athleteActivity',
  'quizAttempts','quizQuestions','weeklyGoals','customDrills','siteContent',
  'videoAnalysis','assignmentProgress','athleteActivity'
];

for (const t of [...new Set(tables)]) {
  try {
    const res = await sql`SELECT COUNT(*) as count FROM ${sql(t)}`;
    console.log(`${t}: ${res[0].count}`);
  } catch (e) {
    console.log(`${t}: ERROR - ${e.message.slice(0,50)}`);
  }
}
await sql.end();
