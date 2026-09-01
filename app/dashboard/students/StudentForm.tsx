"use client";

import { FormEvent, useState } from "react";

type Student = {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    nickname: string;
    student_number: string;
    class_name: string;
    date_of_birth: string;
    gender: string;
    address: string;
    status: string;
    guardian_name: string;
    guardian_relation: string;
    guardian_phone: string;
    guardian_email: string;
};

type StudentFormProps = {
    student?: Student;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function StudentForm({
    student,
    onSuccess,
    onCancel,
}: StudentFormProps) {
    const isEdit = !!student;

    const [form, setForm] = useState({
        first_name: student?.first_name ?? "",
        middle_name: student?.middle_name ?? "",
        last_name: student?.last_name ?? "",
        student_number: student?.student_number ?? "",
        class_name: student?.class_name ?? "",
        date_of_birth: student?.date_of_birth ?? "",
        gender: student?.gender ?? "",
        address: student?.address ?? "",
        status: student?.status ?? "ACTIVE",
        guardian_name: student?.guardian_name ?? "",
        guardian_relation: student?.guardian_relation ?? "",
        guardian_phone: student?.guardian_phone ?? "",
        guardian_email: student?.guardian_email ?? "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function handleChange(
        event: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
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
            const url = student
                ? `/api/proxy/students/${student.id}/`
                : "/api/proxy/students/";

            const method = student ? "PATCH" : "POST";

            const body = student
                ? {
                    ...form,
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
                        ? "Failed to update student"
                        : "Failed to create student"
                );
            }

            onSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : isEdit
                        ? "Failed to update student"
                        : "Failed to create student"
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
                            {isEdit ? "Edit Student" : "Add Student"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Update student and guardian information."
                                : "Complete the student and guardian details for a new enrollment."}
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
                    <h3>Student Details</h3>

                    <div className="form-grid">
                        <div className="form-field full">
                            <label htmlFor="first_name">First name</label>
                            <input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="middle_name">Middle name</label>
                            <input id="middle_name" name="middle_name" value={form.middle_name} onChange={handleChange} />
                        </div>

                        <div className="form-field">
                            <label htmlFor="last_name">Last name</label>
                            <input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="student_number">Student ID (NIS)</label>
                            <input id="student_number" name="student_number" value={form.student_number} onChange={handleChange} placeholder="26009" required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="class_name">Class</label>
                            <select id="class_name" name="class_name" value={form.class_name} onChange={handleChange} required>
                                <option value="">Select class</option>
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="gender">Gender</label>
                            <select id="gender" name="gender" value={form.gender} onChange={handleChange} required>
                                <option value="">Select gender</option>
                                <option value="FEMALE">Female</option>
                                <option value="MALE">Male</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="date_of_birth">Date of birth</label>
                            <input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="status">Status</label>
                            <select id="status" name="status" value={form.status} onChange={handleChange}>
                                <option value="ACTIVE">Active</option>
                                <option value="NEW">New</option>
                                <option value="LEAVE">Leave</option>
                            </select>
                        </div>

                        <div className="form-field full">
                            <label htmlFor="address">Home address</label>
                            <textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder="Jl. Melati No. 12, Bandung" />
                        </div>
                    </div>

                    <h3>Guardian Details</h3>

                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="guardian_name">Guardian name</label>
                            <input id="guardian_name" name="guardian_name" value={form.guardian_name} onChange={handleChange} required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="guardian_relation">Relationship</label>
                            <select id="guardian_relation" name="guardian_relation" value={form.guardian_relation} onChange={handleChange} required>
                                <option value="">Select relationship</option>
                                <option value="MOTHER">Mother</option>
                                <option value="FATHER">Father</option>
                                <option value="GUARDIAN">Guardian</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="guardian_phone">WhatsApp number</label>
                            <input id="guardian_phone" name="guardian_phone" type="tel" value={form.guardian_phone} onChange={handleChange} placeholder="0812-3456-7890" required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="guardian_email">Email</label>
                            <input id="guardian_email" name="guardian_email" type="email" value={form.guardian_email} onChange={handleChange} placeholder="guardian@email.com" />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="button-primary"
                            disabled={loading}
                        >
                            {loading
                                ? isEdit
                                    ? "Saving..."
                                    : "Adding..."
                                : isEdit
                                    ? "Save Changes"
                                    : "Save Student"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
