"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import StudentForm from "./StudentForm";

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

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("ALL");
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [deactivatingStudent, setDeactivatingStudent] = useState<Student | null>(null);
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

            setStudents(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.results)
                        ? data.results
                        : []
            );
        } catch (loadError) {
            console.error(loadError);
            setError("Failed to load students.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStudents();
    }, []);

    async function deactivateStudent() {
        if (!deactivatingStudent) return;

        try {
            setActionError("");
            const response = await fetch(`/api/proxy/students/${deactivatingStudent.id}/`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            });

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to deactivate student");
            }

            setDeactivatingStudent(null);
            await loadStudents();
        } catch (actionLoadError) {
            console.error(actionLoadError);
            setActionError("Failed to deactivate student.");
        }
    }

    const classes = Array.from(
        new Set(students.map((student) => student.class_name).filter(Boolean))
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
                        {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}
                    </span>
                </div>

                {loading ? (
                    <p className="empty-state">Loading students...</p>
                ) : error ? (
                    <div className="empty-state">
                        <p>{error}</p>
                        <button type="button" className="button-secondary" onClick={loadStudents}>
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
                                    <th>NIS</th>
                                    <th>Class</th>
                                    <th>Gender</th>
                                    <th>Parent / Guardian</th>
                                    <th>WhatsApp</th>
                                    <th>Status</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id}>
                                        <td>{[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ")}</td>
                                        <td>{student.student_number || "-"}</td>
                                        <td>{student.class_name || "-"}</td>
                                        <td>{student.gender || "-"}</td>
                                        <td>{student.guardian_name || "-"}</td>
                                        <td>{student.guardian_phone || "-"}</td>
                                        <td><span className="status-badge">{student.status || "ACTIVE"}</span></td>
                                        <td>
                                            <div className="student-action-wrap">
                                                <details className="action-menu-details">
                                                    <summary className="more-button" aria-label={`Actions for ${student.first_name} ${student.last_name}`}>
                                                        <span className="vertical-dots" aria-hidden="true"><i /><i /><i /></span>
                                                    </summary>
                                                    <div className="action-menu">
                                                        <button className="action-menu-item" type="button" onClick={() => setViewingStudent(student)}>View</button>
                                                        <button className="action-menu-item" type="button" onClick={() => setEditingStudent(student)}>Edit</button>
                                                        <button className="action-menu-item danger" type="button" onClick={() => setDeactivatingStudent(student)}>Deactivate</button>
                                                    </div>
                                                </details>
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
                            <button type="button" className="modal-close" onClick={() => setViewingStudent(null)}>×</button>
                        </div>
                        <div className="detail-grid">
                            <div className="detail-item"><span>Name</span><strong>{[viewingStudent.first_name, viewingStudent.middle_name, viewingStudent.last_name].filter(Boolean).join(" ")}</strong></div>
                            <div className="detail-item"><span>Student ID</span><strong>{viewingStudent.student_number || "-"}</strong></div>
                            <div className="detail-item"><span>Class</span><strong>{viewingStudent.class_name || "-"}</strong></div>
                            <div className="detail-item"><span>Gender</span><strong>{viewingStudent.gender || "-"}</strong></div>
                            <div className="detail-item"><span>Date of birth</span><strong>{viewingStudent.date_of_birth || "-"}</strong></div>
                            <div className="detail-item"><span>Status</span><strong>{viewingStudent.status || "ACTIVE"}</strong></div>
                            <div className="detail-item"><span>Guardian</span><strong>{viewingStudent.guardian_name || "-"}</strong></div>
                            <div className="detail-item"><span>Guardian phone</span><strong>{viewingStudent.guardian_phone || "-"}</strong></div>
                            <div className="detail-item"><span>Guardian email</span><strong>{viewingStudent.guardian_email || "-"}</strong></div>
                            <div className="detail-item"><span>Address</span><strong>{viewingStudent.address || "-"}</strong></div>
                        </div>
                    </div>
                </div>
            )}

            {deactivatingStudent && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2>Deactivate student?</h2>
                                <p>This will deactivate {deactivatingStudent.first_name} {deactivatingStudent.last_name}.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setDeactivatingStudent(null)}>×</button>
                        </div>
                        {actionError && <div className="form-error">{actionError}</div>}
                        <div className="modal-actions">
                            <button type="button" className="button-secondary" onClick={() => setDeactivatingStudent(null)}>Cancel</button>
                            <button type="button" className="button-primary danger-button" onClick={deactivateStudent}>Deactivate</button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}