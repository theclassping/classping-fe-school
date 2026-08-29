"use client";

import Link from "next/link";

const stats = [
  {
    label: "Total Students",
    value: "248",
    change: "+12 this month",
    icon: "👨‍🎓",
    href: "/dashboard/students",
  },
  {
    label: "Teachers",
    value: "24",
    change: "+2 this month",
    icon: "👩‍🏫",
    href: "/dashboard/teachers",
  },
  {
    label: "Parents",
    value: "186",
    change: "+8 this month",
    icon: "👨‍👩‍👧",
    href: "/dashboard/users",
  },
  {
    label: "Outstanding Payment",
    value: "$12,450",
    change: "32 invoices",
    icon: "💳",
    href: "/dashboard/payments",
  },
];

const activities = [
  {
    title: "Monthly activity report submitted",
    description: "Mrs. Sarah Johnson submitted an activity report",
    time: "10 minutes ago",
    type: "Activity",
  },
  {
    title: "Assessment completed",
    description: "Grade 3 Mathematics assessment was completed",
    time: "35 minutes ago",
    type: "Assessment",
  },
  {
    title: "New student registered",
    description: "Emily Anderson was added to Grade 2",
    time: "1 hour ago",
    type: "Student",
  },
  {
    title: "Payment received",
    description: "Tuition payment received from Michael Brown",
    time: "2 hours ago",
    type: "Payment",
  },
];

const quickActions = [
  {
    label: "Add Student",
    description: "Register a new student",
    href: "/dashboard/students",
  },
  {
    label: "Add Teacher",
    description: "Create a teacher account",
    href: "/dashboard/teachers",
  },
  {
    label: "View Payments",
    description: "Check outstanding payments",
    href: "/dashboard/payments",
  },
  {
    label: "View Activities",
    description: "Review recent activities",
    href: "/dashboard/activities",
  },
];

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Overview</p>

          <h1>Good morning 👋</h1>

          <p>
            Here&apos;s what&apos;s happening at your school today.
          </p>
        </div>

        <div className="dashboard-date">
          <span>Today</span>
          <strong>August 29, 2026</strong>
        </div>
      </div>

      {/* Stats */}
      <section className="dashboard-stats">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="stat-card"
          >
            <div className="stat-card-top">
              <span className="stat-icon">{stat.icon}</span>

              <span className="stat-arrow">↗</span>
            </div>

            <div className="stat-value">{stat.value}</div>

            <div className="stat-label">{stat.label}</div>

            <div className="stat-change">{stat.change}</div>
          </Link>
        ))}
      </section>

      {/* Main grid */}
      <section className="dashboard-grid">
        {/* Recent activity */}
        <div className="panel dashboard-activity">
          <div className="panel-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest updates from your school</p>
            </div>

            <Link href="/dashboard/activities">
              View all
            </Link>
          </div>

          <div className="activity-list">
            {activities.map((activity, index) => (
              <div
                className="activity-item"
                key={`${activity.title}-${index}`}
              >
                <div className="activity-dot" />

                <div className="activity-content">
                  <div className="activity-title">
                    {activity.title}
                  </div>

                  <div className="activity-description">
                    {activity.description}
                  </div>

                  <div className="activity-meta">
                    <span>{activity.type}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment overview */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Payment Overview</h2>
              <p>Current tuition status</p>
            </div>

            <Link href="/dashboard/payments">
              View all
            </Link>
          </div>

          <div className="payment-summary">
            <div className="payment-total">
              <span>Total outstanding</span>
              <strong>$12,450</strong>
            </div>

            <div className="payment-progress">
              <div
                className="payment-progress-bar"
                style={{ width: "72%" }}
              />
            </div>

            <div className="payment-stats">
              <div>
                <strong>168</strong>
                <span>Paid</span>
              </div>

              <div>
                <strong>32</strong>
                <span>Outstanding</span>
              </div>

              <div>
                <strong>12</strong>
                <span>Overdue</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom grid */}
      <section className="dashboard-grid dashboard-grid-bottom">
        {/* Quick actions */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Common tasks</p>
            </div>
          </div>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="quick-action"
              >
                <div>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </div>

                <span className="quick-action-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* School snapshot */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>School Snapshot</h2>
              <p>This month</p>
            </div>
          </div>

          <div className="snapshot-list">
            <div className="snapshot-row">
              <span>Attendance</span>
              <strong>94.8%</strong>
            </div>

            <div className="snapshot-row">
              <span>Activities completed</span>
              <strong>86</strong>
            </div>

            <div className="snapshot-row">
              <span>Assessments completed</span>
              <strong>124</strong>
            </div>

            <div className="snapshot-row">
              <span>New students</span>
              <strong>12</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}