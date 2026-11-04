"use client";

import { FormEvent, useEffect, useState } from "react";
import { loadList } from "@/lib/loadList";

type Teacher = {
    id: number;
    first_name: string;
    last_name: string;
};

function teacherName(teacher: Teacher) {
    return `${teacher.first_name} ${teacher.last_name}`.trim();
}

type AcademicYear = {
    id: number;
    name: string;
};

type Class = {
    id: number;
    class_name: string;
    academic_year_name: string;
    teacher_name: string;
};

type ClassFormProps = {
    classData?: Class;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function ClassForm({
    classData  ,
    onSuccess,
    onCancel,
}: ClassFormProps) {
    const isEdit = !!classData;

    const [form, setForm] = useState({
        class_name: classData?.class_name ?? "",
        academic_year_name: classData?.academic_year_name ?? "",
        academic_year: "",
        teacher_name: classData?.teacher_name ?? "",
    });
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [academicYearsLoading, setAcademicYearsLoading] = useState(true);
    const [academicYearsError, setAcademicYearsError] = useState("");
    const [branchId, setBranchId] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [teachersLoading, setTeachersLoading] = useState(true);
    const [teachersError, setTeachersError] = useState("");
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);

    useEffect(() => {
        if (branchId === null) return;
        const controller = new AbortController();

        async function loadTeachers() {
            try {
                let url = `/api/proxy/staffs/?staff_type=teacher&branch_id=${branchId}`;
                const visited = new Set<string>();
                const records: Teacher[] = [];

                while (!visited.has(url)) {
                    visited.add(url);
                    const response = await fetch(url, {
                        credentials: "include",
                        cache: "no-store",
                        signal: controller.signal,
                    });
                    if (response.status === 401) {
                        window.location.href = "/login";
                        return;
                    }
                    if (!response.ok) throw new Error("Gagal memuat guru. Buka kembali form untuk mencoba lagi.");

                    const data = await response.json();
                    records.push(...(Array.isArray(data) ? data : data.results ?? data.data ?? []));
                    if (!data.next) break;
                    const params = new URL(data.next, window.location.origin).searchParams;
                    params.set("staff_type", "teacher");
                    params.set("branch_id", String(branchId));
                    url = `/api/proxy/staffs/?${params}`;
                }

                if (!controller.signal.aborted) setTeachers(records);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setTeachersError(err instanceof Error ? err.message : "Gagal memuat guru.");
                }
            } finally {
                if (!controller.signal.aborted) setTeachersLoading(false);
            }
        }

        void loadTeachers();
        return () => controller.abort();
    }, [branchId]);

    useEffect(() => {
        let active = true;
        async function loadAcademicYears() {
            try {
                const response = await fetch("/api/auth/session", {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!response.ok) throw new Error("Gagal memuat sesi pengguna.");
                const session = await response.json();
                const userBranchId = session.user?.branch_id;
                if (!Number.isInteger(userBranchId) || userBranchId <= 0) {
                    throw new Error("Tidak ada cabang sekolah yang terhubung dengan akun Anda.");
                }
                if (active) setBranchId(userBranchId);
                const records = await loadList<AcademicYear>(`/api/proxy/academic-years/?branch_id=${userBranchId}&is_current=true`);
                if (active) setAcademicYears(records);
            } catch (error) {
                if (active) setAcademicYearsError(error instanceof Error ? error.message : "Gagal memuat tahun ajaran. Buka kembali form untuk mencoba lagi.");
            } finally {
                if (active) setAcademicYearsLoading(false);
            }
        }
        void loadAcademicYears();
        return () => { active = false; };
    }, []);

    function handleChange(
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            const url = classData
                ? `/api/proxy/classes/${classData.id}/`
                : "/api/proxy/classes/";

            const method = classData ? "PATCH" : "POST";

            if (!classData && branchId === null) {
                throw new Error("Cabang sekolah tidak tersedia.");
            }

            if (!classData && !academicYears.some((year) => year.id === Number(form.academic_year))) {
                throw new Error("Pilih tahun ajaran yang tersedia.");
            }

            const body = classData
                ? {
                    class_name: form.class_name,
                    academic_year_name: form.academic_year_name,
                    teacher_name: form.teacher_name,
                }
                : {
                    name: form.class_name.trim(),
                    branch: branchId,
                    academic_year: Number(form.academic_year),
                    teacher_ids: selectedTeacherIds,
                };

            console.log(
                isEdit
                    ? "UPDATE CLASS SUBMIT:"
                    : "CREATE CLASS SUBMIT:",
                body
            );

            const response = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            console.log(
                isEdit
                    ? "UPDATE CLASS RESPONSE:"
                    : "CREATE CLASS RESPONSE:",
                {
                    status: response.status,
                    data,
                }
            );

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                if (typeof data === "object") {
                    const messages = Object.entries(data)
                        .map(([field, value]) => {
                            const message = Array.isArray(value)
                                ? value.join(", ")
                                : String(value);

                            return `${field}: ${message}`;
                        })
                        .join("\n");

                    throw new Error(messages);
                }

                throw new Error(
                    isEdit
                        ? "Gagal memperbarui kelas"
                        : "Gagal membuat kelas"
                );
            }

            onSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : isEdit
                        ? "Gagal memperbarui kelas"
                        : "Gagal membuat kelas"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal app-form-modal">
                <div className="modal-header">
                    <div>
                        <h2>
                            {isEdit ? "Edit Kelas" : "Tambah Kelas"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Perbarui informasi kelas."
                                : "Tambahkan kelas ClassPing baru."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        aria-label="Tutup formulir"
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="class_name">
                                Nama kelas
                            </label>

                            <input
                                id="class_name"
                                name="class_name"
                                value={form.class_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="academic_year_name">
                                Tahun ajaran
                            </label>

                            <select
                                id="academic_year_name"
                                name={isEdit ? "academic_year_name" : "academic_year"}
                                value={isEdit ? form.academic_year_name : form.academic_year}
                                onChange={handleChange}
                                disabled={academicYearsLoading || !!academicYearsError}
                                required
                            >
                                <option value="">{academicYearsLoading ? "Memuat tahun ajaran..." : "Pilih tahun ajaran"}</option>
                                {isEdit && form.academic_year_name && !academicYears.some((year) => year.name === form.academic_year_name) && (
                                    <option value={form.academic_year_name}>{form.academic_year_name}</option>
                                )}
                                {academicYears.map((academicYear) => (
                                    <option key={academicYear.id} value={isEdit ? academicYear.name : academicYear.id}>
                                        {academicYear.name}
                                    </option>
                                ))}
                            </select>
                            {academicYearsError && <div className="form-error" role="alert">{academicYearsError}</div>}
                            {!academicYearsLoading && !academicYearsError && academicYears.length === 0 && <p>Belum ada tahun ajaran tersedia.</p>}
                        </div>

                        {!isEdit && <div className="form-field full">
                            <label id="class-teachers-label">Guru kelas</label>
                            <div className="student-checkbox-list" role="group" aria-labelledby="class-teachers-label">
                                {teachersLoading ? <p>Memuat guru...</p> : teachers.map((teacher) => (
                                    <label key={teacher.id} className="student-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedTeacherIds.includes(teacher.id)}
                                            onChange={(event) => setSelectedTeacherIds((current) => event.target.checked
                                                ? [...current, teacher.id]
                                                : current.filter((id) => id !== teacher.id))}
                                            disabled={loading}
                                        />
                                        <span>{teacherName(teacher)}</span>
                                    </label>
                                ))}
                            </div>
                            {teachersError && <p className="form-error" role="alert">{teachersError}</p>}
                            {!teachersLoading && !teachersError && teachers.length === 0 && <p>Belum ada guru tersedia.</p>}
                            <small>Pilih satu atau lebih guru untuk kelas ini.</small>
                        </div>}

                        {isEdit && <div className="form-field full">
                            <label htmlFor="teacher_name">
                                Wali kelas
                            </label>

                            <select
                                id="teacher_name"
                                name="teacher_name"
                                value={form.teacher_name}
                                onChange={handleChange}
                                disabled={teachersLoading || !!teachersError}
                                required
                            >
                                <option value="">
                                    {teachersLoading ? "Memuat guru..." : "Pilih wali kelas"}
                                </option>
                                {form.teacher_name && !teachers.some((teacher) => teacherName(teacher) === form.teacher_name) && (
                                    <option value={form.teacher_name}>{form.teacher_name}</option>
                                )}
                                {teachers.map((teacher) => (
                                    <option key={teacher.id} value={teacherName(teacher)}>
                                        {teacherName(teacher)}
                                    </option>
                                ))}
                            </select>
                            {teachersError && <div className="form-error" role="alert">{teachersError}</div>}
                            {!teachersLoading && !teachersError && teachers.length === 0 && (
                                <p>Belum ada guru tersedia.</p>
                            )}
                        </div>}
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            className="button-primary"
                            disabled={loading || teachersLoading || !!teachersError || academicYearsLoading || !!academicYearsError || (!isEdit && branchId === null) || !(isEdit ? form.academic_year_name : form.academic_year)}
                        >
                            {loading
                                ? isEdit
                                    ? "Menyimpan..."
                                    : "Membuat..."
                                : isEdit
                                    ? "Simpan Perubahan"
                                    : "Simpan Kelas"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
