"use client";

import { FormEvent, useEffect, useState } from "react";

type Location = {
    id: number;
    name: string;
    type: string;
    parent_id?: number | null;
};

type Student = {
    id: number;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    nickname?: string;
    student_number?: string;
    class_name?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    status?: string;
    guardian_name?: string;
    guardian_relation?: string;
    guardian_phone?: string;
    guardian_email?: string;
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
        nickname: student?.nickname ?? "",
        student_number: student?.student_number ?? "",
        class_name: student?.class_name ?? "",
        location_id: "",
        date_of_birth: student?.date_of_birth ?? "",
        gender: student?.gender ?? "",
        address: student?.address ?? "",
        status: student?.status?.toLowerCase() ?? "active",
        enroll_date: new Date().toISOString().slice(0, 10),
        guardian_name: student?.guardian_name ?? "",
        guardian_relation: student?.guardian_relation ?? "",
        guardian_phone: student?.guardian_phone ?? "",
        guardian_email: student?.guardian_email ?? "",
        guardian_password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [locations, setLocations] = useState<Record<string, Location[]>>({});
    const [locationIds, setLocationIds] = useState<Record<string, string>>({});
    const [locationsLoading, setLocationsLoading] = useState(false);

    async function loadLocations(type: string, parentId?: string) {
        const params = new URLSearchParams({ type });
        if (parentId) params.set("parent_id", parentId);

        const response = await fetch(`/api/proxy/locations/?${params.toString()}`, {
            credentials: "include",
            cache: "no-store",
        });

        if (response.status === 401) {
            window.location.href = "/login";
            return;
        }

        if (!response.ok) throw new Error(`Failed to load ${type.toLowerCase()} locations`);

        const data = await response.json();
        const records = Array.isArray(data)
            ? data
            : Array.isArray(data.results)
                ? data.results
                : Array.isArray(data.data)
                    ? data.data
                    : [];

        setLocations((current) => ({ ...current, [type]: records }));
    }

    useEffect(() => {
        setLocationsLoading(true);
        void loadLocations("COUNTRY").catch((loadError) => {
            console.error(loadError);
            setError("Failed to load locations.");
        }).finally(() => setLocationsLoading(false));
    }, []);

    function handleLocationChange(type: string, value: string, childType?: string) {
        setLocationIds((current) => ({ ...current, [type]: value }));
        setForm((current) => ({ ...current, location_id: value }));

        if (childType) {
            setLocationIds((current) => {
                const next = { ...current };
                const types = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"];
                const childIndex = types.indexOf(childType);
                types.slice(childIndex).forEach((locationType) => delete next[locationType]);
                return next;
            });
            void loadLocations(childType, value).catch((loadError) => {
                console.error(loadError);
                setError(`Failed to load ${childType.toLowerCase()} locations.`);
            });
        }
    }

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

            const [guardianFirstName, ...guardianLastNameParts] = form.guardian_name.trim().split(/\s+/);
            const guardianLastName = guardianLastNameParts.join(" ") || guardianFirstName;
            const body = student
                ? { ...form }
                : {
                    first_name: form.first_name,
                    middle_name: form.middle_name,
                    last_name: form.last_name,
                    nickname: form.nickname,
                    date_of_birth: form.date_of_birth,
                    image_data: null,
                    gender: form.gender.toLowerCase(),
                    address: form.address,
                    location_id: Number(form.location_id),
                    status: form.status.toLowerCase(),
                    enroll_date: form.enroll_date,
                    student_guardians: [
                        {
                            relationship: form.guardian_relation.toLowerCase(),
                            is_primary: true,
                            user: {
                                email: form.guardian_email,
                                password: form.guardian_password,
                                first_name: guardianFirstName,
                                last_name: guardianLastName,
                                phone_number: form.guardian_phone,
                                image_data: null,
                            },
                        },
                    ],
                    class_students: [
                        {
                            class_id: Number(form.class_name),
                            is_current: true,
                        },
                    ],
                };

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
                            <label htmlFor="nickname">Nickname</label>
                            <input id="nickname" name="nickname" value={form.nickname} onChange={handleChange} />
                        </div>

                        <div className="form-field">
                            <label htmlFor="student_number">Student ID (NIS)</label>
                            <input id="student_number" name="student_number" value={form.student_number} onChange={handleChange} placeholder="26009" required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="class_name">Class</label>
                            <select id="class_name" name="class_name" value={form.class_name} onChange={handleChange} required>
                                <option value="">Select class</option>
                                <option value="1">A1</option>
                                <option value="2">A2</option>
                                <option value="3">B1</option>
                                <option value="4">B2</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="gender">Gender</label>
                            <select id="gender" name="gender" value={form.gender} onChange={handleChange} required>
                                <option value="">Select gender</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="date_of_birth">Date of birth</label>
                            <input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="status">Status</label>
                            <select id="status" name="status" value={form.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="new">New</option>
                                <option value="leave">Leave</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="enroll_date">Enrollment date</label>
                            <input id="enroll_date" name="enroll_date" type="date" value={form.enroll_date} onChange={handleChange} required />
                        </div>

                        {[
                            { type: "COUNTRY", label: "Country", child: "PROVINCE" },
                            { type: "PROVINCE", label: "Province", child: "CITY" },
                            { type: "CITY", label: "City", child: "DISTRICT" },
                            { type: "DISTRICT", label: "District", child: "VILLAGE" },
                            { type: "VILLAGE", label: "Village" },
                        ].map((location) => {
                            const parentType = {
                                PROVINCE: "COUNTRY",
                                CITY: "PROVINCE",
                                DISTRICT: "CITY",
                                VILLAGE: "DISTRICT",
                            }[location.type];
                            const parentId = parentType ? locationIds[parentType] : undefined;
                            const isEnabled = !parentType || Boolean(parentId);
                            const options = locations[location.type] ?? [];

                            return (
                                <div className="form-field" key={location.type}>
                                    <label htmlFor={`location-${location.type}`}>{location.label}</label>
                                    <select
                                        id={`location-${location.type}`}
                                        value={locationIds[location.type] ?? ""}
                                        disabled={!isEnabled || locationsLoading}
                                        required={location.type === "VILLAGE"}
                                        onChange={(event) => handleLocationChange(location.type, event.target.value, location.child)}
                                    >
                                        <option value="">Select {location.label.toLowerCase()}</option>
                                        {options.map((option) => (
                                            <option key={option.id} value={option.id}>{option.name}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}

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
                                <option value="mother">Mother</option>
                                <option value="father">Father</option>
                                <option value="guardian">Guardian</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="guardian_phone">WhatsApp number</label>
                            <input id="guardian_phone" name="guardian_phone" type="tel" value={form.guardian_phone} onChange={handleChange} placeholder="0812-3456-7890" required />
                        </div>

                        <div className="form-field">
                            <label htmlFor="guardian_email">Email</label>
                            <input id="guardian_email" name="guardian_email" type="email" value={form.guardian_email} onChange={handleChange} placeholder="guardian@email.com" required={!isEdit} />
                        </div>

                        {!isEdit && (
                            <div className="form-field">
                                <label htmlFor="guardian_password">Parent password</label>
                                <input id="guardian_password" name="guardian_password" type="password" value={form.guardian_password} onChange={handleChange} minLength={8} required />
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
