"use client";

import { useState } from "react";

const todos = [
  {
    title: "Ingatkan orang tua yang belum bayar",
    description: "3 siswa belum membayar · 1 terlambat",
    action: "Kirim pengingat",
  },
  {
    title: "Periksa foto yang belum ditandai",
    description: "2 foto dari aktivitas Bermain Alat Musik",
    action: "Periksa foto",
  },
  {
    title: "Lengkapi penilaian siswa",
    description: "3 siswa masih memiliki indikator kosong",
    action: "Update nilai",
  },
];

export default function TodoCard() {
  const [completed, setCompleted] = useState<boolean[]>(
    [false, false, false]
  );

  function toggleTodo(index: number) {
    setCompleted((current) =>
      current.map((value, i) =>
        i === index ? !value : value
      )
    );
  }

  const completedCount = completed.filter(Boolean).length;
  const progress =
    (completedCount / todos.length) * 100;

  return (
    <article className="panel todo-card">
      <div className="panel-heading">
        <div>
          <h2>Prioritas Hari Ini</h2>
          <p>
            Tugas penting yang perlu ditindaklanjuti
          </p>
        </div>

        <span className="todo-progress-label">
          {completedCount} dari {todos.length} selesai
        </span>
      </div>

      <div className="todo-progress progress">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="todo-list">
        {todos.map((todo, index) => (
          <label
            key={todo.title}
            className={`todo-item ${
              completed[index] ? "completed" : ""
            }`}
          >
            <input
              className="todo-check"
              type="checkbox"
              checked={completed[index]}
              onChange={() => toggleTodo(index)}
            />

            <span className="todo-box">
              ✓
            </span>

            <span className="todo-copy">
              <strong>{todo.title}</strong>
              <small>{todo.description}</small>
            </span>

            <button
              type="button"
              className="todo-action"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {todo.action}
            </button>
          </label>
        ))}
      </div>
    </article>
  );
}