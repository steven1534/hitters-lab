import { Redirect } from "wouter";

// Admin dashboard redirects to the coach dashboard which contains all admin functionality
export default function AdminDashboard() {
  return <Redirect to="/coach-dashboard" />;
}
