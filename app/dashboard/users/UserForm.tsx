"use client";

import { FormEvent, useState } from "react";

type User = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
};

type UserFormProps = {
    user?: User;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function UserForm({
    user,
    onSuccess,
    onCancel,
}: UserFormProps) {
    const isEdit = !!user;

    const [form, setForm] = useState({
        email: user?.email ?? "",
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
        role: user?.role ?? "STAFF",
        password: "",
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
            const url = user
                ? `/api/proxy/users/${user.id}/`
                : "/api/proxy/users/";

            const method = user ? "PATCH" : "POST";

            const body = user
                ? {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    role: form.role,
                }
                : form;

            console.log(
                isEdit
                    ? "UPDATE USER SUBMIT:"
                    : "CREATE USER SUBMIT:",
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
                    ? "UPDATE USER RESPONSE:"
                    : "CREATE USER RESPONSE:",
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
                        ? "Gagal memperbarui pengguna"
                        : "Gagal membuat pengguna"
                );
            }

            onSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : isEdit
                        ? "Gagal memperbarui pengguna"
                        : "Gagal membuat pengguna"
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
                            {isEdit ? "Edit Pengguna" : "Tambah Pengguna"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Perbarui informasi pengguna."
                                : "Tambahkan pengguna ClassPing baru."}
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
                                <label htmlFor="role">
                                    Peran
                            </label>

                            <select
                                id="role"
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                            >
                                <option value="ADMIN">Admin</option>
                                <option value="STAFF">Staf</option>
                                <option value="TEACHER">Guru</option>
                                <option value="STUDENT">Siswa</option>
                                <option value="PARENT">Wali</option>
                            </select>
                        </div>

                        {!isEdit && (
                            <div className="form-field">
                                <label htmlFor="password">
                                    Kata sandi
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                />
                            </div>
                        )}
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
                                    : "Simpan Pengguna"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
