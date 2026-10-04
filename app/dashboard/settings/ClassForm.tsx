"use client";

import { FormEvent, useState } from "react";

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
        teacher_name: classData?.teacher_name ?? "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

            const body = classData
                ? {
                    class_name: form.class_name,
                    academic_year_name: form.academic_year_name,
                    teacher_name: form.teacher_name,
                }
                : form;

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
            <div className="modal">
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
                            <label htmlFor="name">
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

                            <input
                                id="academic_year_name"
                                name="academic_year_name"
                                value={form.academic_year_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field full">
                            <label htmlFor="teacher_name">
                                Wali kelas
                            </label>

                            <input
                                id="teacher_name"
                                name="teacher_name"
                                value={form.teacher_name}
                                onChange={handleChange}
                                required
                            />
                        </div>
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
                            disabled={loading}
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
