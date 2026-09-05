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
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("ALL");
    const [showStudentForm, setShowStudentForm] = useState(false);

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
        const timer = window.setTimeout(() => void loadStudents(), 0);
        return () => window.clearTimeout(timer);
    }, []);

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
        </main>
    );
}
