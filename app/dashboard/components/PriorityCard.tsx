"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

const tasks = [
  { title: "Ingatkan orang tua yang belum bayar", detail: "3 siswa belum membayar · 1 terlambat", action: "Kirim pengingat", href: "/dashboard/payments" },
  { title: "Periksa foto yang belum ditandai", detail: "2 foto dari aktivitas Bermain Alat Musik", action: "Periksa foto", href: "/dashboard/activities" },
  { title: "Lengkapi penilaian siswa", detail: "3 siswa masih memiliki indikator kosong", action: "Update nilai", href: "/dashboard/assessment" },
];

export default function PriorityCard() {
  const [completed, setCompleted] = useState<boolean[]>(tasks.map(() => false));
  const completedCount = completed.filter(Boolean).length;

  return (
    <article className="panel todo-card">
      <div className="panel-heading">
        <div><h2>Prioritas Hari Ini</h2><p>Tugas penting yang perlu ditindaklanjuti</p></div>
        <span className="todo-progress-label">{completedCount} dari {tasks.length} selesai</span>
      </div>
      <div className="todo-progress progress"><i style={{ width: `${(completedCount / tasks.length) * 100}%` }} /></div>
      <div className="todo-list">
        {tasks.map((task, index) => (
          <label className="todo-item" key={task.title}>
            <input className="todo-check" type="checkbox" checked={completed[index]} onChange={(event) => setCompleted((current) => current.map((value, taskIndex) => taskIndex === index ? event.target.checked : value))} />
            <span className="todo-box"><Check aria-hidden="true" /></span>
            <span className="todo-copy"><strong>{task.title}</strong><small>{task.detail}</small></span>
            <Link href={task.href}>{task.action}</Link>
          </label>
        ))}
      </div>
    </article>
  );
}
