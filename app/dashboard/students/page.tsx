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

function formatClassName(className?: string) {
  if (!className) return "-";
  return className.replace(/^class\b/i, "Kelas");
}

function formatGender(gender?: string) {
  const normalized = gender?.toLowerCase();
  if (normalized === "male") return "Laki-laki";
  if (normalized === "female") return "Perempuan";
  return gender || "-";
}

function formatStatus(status?: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "inactive") return "Nonaktif";
  if (normalized === "new") return "Baru";
  if (normalized === "leave") return "Cuti";
  if (normalized === "active" || !status) return "Aktif";
  return status;
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
        throw new Error("Gagal memuat data siswa");
      }

      const data = await response.json();

      setStudents(normalizeStudents(data));
    } catch (loadError) {
      console.error(loadError);
      setError("Gagal memuat data siswa.");
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
    const actionLabel = isInactive ? "mengaktifkan" : "menonaktifkan";

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
        throw new Error(`Gagal ${actionLabel} siswa`);
      }

      setDeactivatingStudent(null);
      await loadStudents();
    } catch (actionLoadError) {
      console.error(actionLoadError);
      setActionError(`Gagal ${actionLabel} siswa.`);
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
            <h2>Siswa</h2>
            <p>Siswa aktif pada tahun ajaran ini.</p>
          </div>

          <button
            type="button"
            className="button-primary compact-button"
            onClick={() => setShowStudentForm(true)}
          >
            + Tambah Siswa
          </button>
        </div>

        <div className="table-tools">
          <label className="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari siswa atau wali..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter siswa berdasarkan kelas"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="ALL">Semua kelas</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {formatClassName(className)}
              </option>
            ))}
          </select>

          <span className="student-count">
            {filteredStudents.length} siswa
          </span>
        </div>

        {loading ? (
          <p className="empty-state">Memuat data siswa...</p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={loadStudents}
            >
              Coba lagi
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="empty-state">Tidak ada data siswa yang cocok.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Siswa</th>
                  {/* <th>NIS</th> */}
                  <th>Kelas</th>
                  <th>Jenis kelamin</th>
                  <th>Orang tua / Wali</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th className={styles.actionHeading}>Aksi</th>
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
                    <td>{formatClassName(student.class_name)}</td>
                    <td>{formatGender(student.gender)}</td>
                    <td>{student.guardian_name || "-"}</td>
                    <td>{student.guardian_phone || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${student.status?.toLowerCase() === "inactive" ? "inactive" : ""}`}
                      >
                        {formatStatus(student.status)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions} role="group" aria-label={`Aksi untuk ${student.first_name} ${student.last_name}`}>
                        <button
                          className={styles.actionButton}
                          type="button"
                          aria-label={`Lihat ${student.first_name} ${student.last_name}`}
                          title="Lihat siswa"
                          onClick={() => setViewingStudent(student)}
                        >
                          <Eye aria-hidden="true" />
                        </button>
                        <button
                          className={styles.actionButton}
                          type="button"
                          aria-label={`Edit ${student.first_name} ${student.last_name}`}
                          title="Edit siswa"
                          onClick={() => setEditingStudent(student)}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          className={`${styles.actionButton} ${student.status?.toLowerCase() === "inactive" ? "" : styles.dangerButton}`}
                          type="button"
                          aria-label={`${student.status?.toLowerCase() === "inactive" ? "Aktifkan" : "Nonaktifkan"} ${student.first_name} ${student.last_name}`}
                          title={student.status?.toLowerCase() === "inactive" ? "Aktifkan siswa" : "Nonaktifkan siswa"}
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
                <h2>Detail Siswa</h2>
                <p>Lihat informasi siswa dan wali.</p>
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
                <span>Nama</span>
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
                <span>Kelas</span>
                <strong>{formatClassName(viewingStudent.class_name)}</strong>
              </div>
              <div className="detail-item">
                <span>Jenis kelamin</span>
                <strong>{formatGender(viewingStudent.gender)}</strong>
              </div>
              <div className="detail-item">
                <span>Tanggal lahir</span>
                <strong>{viewingStudent.date_of_birth || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong>{formatStatus(viewingStudent.status)}</strong>
              </div>
              <div className="detail-item">
                <span>Wali</span>
                <strong>{viewingStudent.guardian_name || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Nomor WhatsApp wali</span>
                <strong>{viewingStudent.guardian_phone || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Email wali</span>
                <strong>{viewingStudent.guardian_email || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Alamat</span>
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
                    ? "Aktifkan siswa?"
                    : "Nonaktifkan siswa?"}
                </h2>
                <p>
                  Tindakan ini akan{" "}
                  {deactivatingStudent.status?.toLowerCase() === "inactive"
                    ? "mengaktifkan"
                    : "menonaktifkan"}{" "}
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
                Batal
              </button>
              <button
                type="button"
                className={`button-primary ${deactivatingStudent.status?.toLowerCase() === "inactive" ? "" : "danger-button"}`}
                onClick={updateStudentStatus}
              >
                {deactivatingStudent.status?.toLowerCase() === "inactive"
                  ? "Aktifkan"
                  : "Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
