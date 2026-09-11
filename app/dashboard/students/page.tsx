"use client";

import { Ban, CircleCheck, Eye, Pencil, Search } from "lucide-react";
import { useEffect, useState } from "react";
import StudentForm from "./StudentForm";
import styles from "../components/TableActions.module.css";

type Student = {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  student_number?: string;
  class_name?: string;
  gender?: string;
  status?: string;
  guardian_name?: string;
  guardian_phone?: string;
  nickname?: string;
  date_of_birth?: string;
  address?: string;
  guardian_relation?: string;
  guardian_email?: string;
};

type StudentApiRecord = Omit<
  Student,
  | "class_name"
  | "guardian_name"
  | "guardian_phone"
  | "guardian_relation"
  | "guardian_email"
> & {
  class_students?: Array<{
    class_name?: string;
    is_current?: boolean;
  }>;
  student_guardians?: Array<{
    guardian_name?: string;
    guardian_phone_number?: string;
    relationship?: string;
    guardian_email?: string;
    is_primary?: boolean;
  }>;
};

function normalizeStudents(data: unknown): Student[] {
  const records = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: StudentApiRecord[] }).results
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { data?: unknown }).data)
        ? (data as { data: StudentApiRecord[] }).data
        : [];

  return (records as StudentApiRecord[]).map((record) => {
    const currentClass =
      record.class_students?.find((item) => item.is_current) ??
      record.class_students?.[0];
    const guardian =
      record.student_guardians?.find((item) => item.is_primary) ??
      record.student_guardians?.[0];

    return {
      ...record,
      student_number: record.student_number ?? String(record.id),
      class_name: currentClass?.class_name,
      guardian_name: guardian?.guardian_name,
      guardian_phone: guardian?.guardian_phone_number,
      guardian_relation: guardian?.relationship,
      guardian_email: guardian?.guardian_email,
    };
  });
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deactivatingStudent, setDeactivatingStudent] =
    useState<Student | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/proxy/students/", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load students");
      }

      const data = await response.json();

      setStudents(normalizeStudents(data));
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStudents(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function updateStudentStatus() {
    if (!deactivatingStudent) return;

    const isInactive = deactivatingStudent.status?.toLowerCase() === "inactive";
    const nextStatus = isInactive ? "active" : "inactive";
    const actionLabel = isInactive ? "activate" : "deactivate";

    try {
      setActionError("");
      const response = await fetch(
        `/api/proxy/students/${deactivatingStudent.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to ${actionLabel} student`);
      }

      setDeactivatingStudent(null);
      await loadStudents();
    } catch (actionLoadError) {
      console.error(actionLoadError);
      setActionError(`Failed to ${actionLabel} student.`);
    }
  }

  const classes = Array.from(
    new Set(students.map((student) => student.class_name).filter(Boolean)),
  );

  const filteredStudents = students.filter((student) => {
    const name = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchTerm = search.toLowerCase();

    return (
      (name.includes(searchTerm) ||
        student.guardian_name?.toLowerCase().includes(searchTerm)) &&
      (classFilter === "ALL" || student.class_name === classFilter)
    );
  });

  return (
    <main className="dashboard-page">
      <section className="panel student-data">
        <div className="panel-heading student-heading">
          <div>
            <h2>Students</h2>
            <p>Active students for the current school year.</p>
          </div>

          <button
            type="button"
            className="button-primary compact-button"
            onClick={() => setShowStudentForm(true)}
          >
            + Add Student
          </button>
        </div>

        <div className="table-tools">
          <label className="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search students or guardians..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter students by class"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="ALL">All classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <span className="student-count">
            {filteredStudents.length} student
            {filteredStudents.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <p className="empty-state">Loading students...</p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={loadStudents}
            >
              Try again
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="empty-state">No matching student records.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  {/* <th>NIS</th> */}
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Parent / Guardian</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th className={styles.actionHeading}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      {[
                        student.first_name,
                        student.middle_name,
                        student.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    {/* <td>{student.student_number || "-"}</td> */}
                    <td>{student.class_name || "-"}</td>
                    <td>{student.gender || "-"}</td>
                    <td>{student.guardian_name || "-"}</td>
                    <td>{student.guardian_phone || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${student.status?.toLowerCase() === "inactive" ? "inactive" : ""}`}
                      >
                        {student.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions} role="group" aria-label={`Actions for ${student.first_name} ${student.last_name}`}>
                        <button
                          className={styles.actionButton}
                          type="button"
                          aria-label={`View ${student.first_name} ${student.last_name}`}
                          title="View student"
                          onClick={() => setViewingStudent(student)}
                        >
                          <Eye aria-hidden="true" />
                        </button>
                        <button
                          className={styles.actionButton}
                          type="button"
                          aria-label={`Edit ${student.first_name} ${student.last_name}`}
                          title="Edit student"
                          onClick={() => setEditingStudent(student)}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          className={`${styles.actionButton} ${student.status?.toLowerCase() === "inactive" ? "" : styles.dangerButton}`}
                          type="button"
                          aria-label={`${student.status?.toLowerCase() === "inactive" ? "Activate" : "Deactivate"} ${student.first_name} ${student.last_name}`}
                          title={student.status?.toLowerCase() === "inactive" ? "Activate student" : "Deactivate student"}
                          onClick={() => setDeactivatingStudent(student)}
                        >
                          {student.status?.toLowerCase() === "inactive"
                            ? <CircleCheck aria-hidden="true" />
                            : <Ban aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showStudentForm && (
        <StudentForm
          onCancel={() => setShowStudentForm(false)}
          onSuccess={async () => {
            setShowStudentForm(false);
            await loadStudents();
          }}
        />
      )}

      {editingStudent && (
        <StudentForm
          student={editingStudent}
          onCancel={() => setEditingStudent(null)}
          onSuccess={async () => {
            setEditingStudent(null);
            await loadStudents();
          }}
        />
      )}

      {viewingStudent && (
        <div className="modal-overlay">
          <div className="modal student-detail-modal">
            <div className="modal-header">
              <div>
                <h2>Student Details</h2>
                <p>View student and guardian information.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewingStudent(null)}
              >
                ×
              </button>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span>Name</span>
                <strong>
                  {[
                    viewingStudent.first_name,
                    viewingStudent.middle_name,
                    viewingStudent.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </strong>
              </div>
              {/* <div className="detail-item"><span>Student ID</span><strong>{viewingStudent.student_number || "-"}</strong></div> */}
              <div className="detail-item">
                <span>Class</span>
                <strong>{viewingStudent.class_name || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Gender</span>
                <strong>{viewingStudent.gender || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Date of birth</span>
                <strong>{viewingStudent.date_of_birth || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong>{viewingStudent.status || "ACTIVE"}</strong>
              </div>
              <div className="detail-item">
                <span>Guardian</span>
                <strong>{viewingStudent.guardian_name || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Guardian phone</span>
                <strong>{viewingStudent.guardian_phone || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Guardian email</span>
                <strong>{viewingStudent.guardian_email || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Address</span>
                <strong>{viewingStudent.address || "-"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {deactivatingStudent && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {deactivatingStudent.status?.toLowerCase() === "inactive"
                    ? "Activate student?"
                    : "Deactivate student?"}
                </h2>
                <p>
                  This will{" "}
                  {deactivatingStudent.status?.toLowerCase() === "inactive"
                    ? "activate"
                    : "deactivate"}{" "}
                  {deactivatingStudent.first_name}{" "}
                  {deactivatingStudent.last_name}.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeactivatingStudent(null)}
              >
                ×
              </button>
            </div>
            {actionError && <div className="form-error">{actionError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setDeactivatingStudent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button-primary ${deactivatingStudent.status?.toLowerCase() === "inactive" ? "" : "danger-button"}`}
                onClick={updateStudentStatus}
              >
                {deactivatingStudent.status?.toLowerCase() === "inactive"
                  ? "Activate"
                  : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
