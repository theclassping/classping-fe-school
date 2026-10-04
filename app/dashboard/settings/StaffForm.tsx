"use client";

import { FormEvent, useState } from "react";

type Staff = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    staff_type: string;
    hire_date: string;
    qualification: string;
    is_active: boolean;
};

type StaffFormProps = {
    staff?: Staff;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function StaffForm({
    staff,
    onSuccess,
    onCancel,
}: StaffFormProps) {
    const isEdit = !!staff;

    const [form, setForm] = useState({
        email: staff?.email ?? "",
        first_name: staff?.first_name ?? "",
        last_name: staff?.last_name ?? "",
        phone: staff?.phone ?? "",
        staff_type: staff?.staff_type ?? "STAFF",
        hire_date: staff?.hire_date ?? "",
        qualification: staff?.qualification ?? "",
        is_active: staff?.is_active ?? true,
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
            const url = staff
                ? `/api/proxy/staffs/${staff.id}/`
                : "/api/proxy/staffs/";

            const method = staff ? "PATCH" : "POST";

            const body = staff
                ? {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    phone: form.phone,
                    staff_type: form.staff_type,
                    hire_date: form.hire_date,
                    qualification: form.qualification,
                    is_active: form.is_active,
                }
                : form;

            console.log(
                isEdit
                    ? "UPDATE STAFF SUBMIT:"
                    : "CREATE STAFF SUBMIT:",
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
                    ? "UPDATE STAFF RESPONSE:"
                    : "CREATE STAFF RESPONSE:",
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
                        ? "Gagal memperbarui data staf"
                        : "Gagal membuat data staf"
                );
            }

            onSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : isEdit
                        ? "Gagal memperbarui data staf"
                        : "Gagal membuat data staf"
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
                            {isEdit ? "Edit Staf" : "Tambah Staf"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Perbarui informasi staf."
                                : "Tambahkan staf ClassPing baru."}
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
                            <label htmlFor="first_name">
                                Nama depan
                            </label>

                            <input
                                id="first_name"
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="last_name">
                                Nama belakang
                            </label>

                            <input
                                id="last_name"
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field full">
                            <label htmlFor="email">
                                Email
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                disabled={isEdit}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="staff_type">
                                Jenis staf
                            </label>

                            <select
                                id="staff_type"
                                name="staff_type"
                                value={form.staff_type}
                                onChange={handleChange}
                            >
                                <option value="principal">Kepala sekolah</option>
                                <option value="teacher">Guru</option>
                                <option value="officer">Staf</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="phone">
                                Nomor telepon
                            </label>

                            <input
                                id="phone"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="hire_date">
                                Tanggal masuk
                            </label>

                            <input
                                id="hire_date"
                                name="hire_date"
                                type="date"
                                value={form.hire_date}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field full">
                            <label htmlFor="qualification">
                                Kualifikasi
                            </label>

                            <input
                                id="qualification"
                                name="qualification"
                                value={form.qualification}
                                onChange={handleChange}
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
                                    : "Simpan Staf"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
