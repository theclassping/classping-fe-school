"use client";

import { FormEvent, useState } from "react";

type FeeType = {
    id: number;
    name: string;
    description: string;
    amount: number;
    branch: number;
    is_recurring: boolean;
    is_active: boolean;
};

type FeeTypeFormProps = {
    feeType?: FeeType;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function FeeTypeForm({
    feeType,
    onSuccess,
    onCancel,
}: FeeTypeFormProps) {
    const isEdit = !!feeType;

    const [form, setForm] = useState({
        name: feeType?.name ?? "",
        description: feeType?.description ?? "",
        amount: feeType?.amount ?? 0,
        branch: feeType?.branch ?? 0,
        is_recurring: feeType?.is_recurring ?? false,
        is_active: feeType?.is_active ?? true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function handleChange(
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = event.target;
        const nextValue =
            event.target instanceof HTMLInputElement &&
            event.target.type === "checkbox"
                ? event.target.checked
                : value;

        setForm((previous) => ({
            ...previous,
            [name]: nextValue,
        }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            const url = feeType
                ? `/api/proxy/fee-types/${feeType.id}/`
                : "/api/proxy/fee-types/";

            const method = feeType ? "PATCH" : "POST";

            const body = feeType
                ? {
                    name: form.name,
                    description: form.description,
                    amount: form.amount,
                    branch: form.branch,
                    is_recurring: form.is_recurring,
                    is_active: form.is_active,
                }
                : form;

            console.log(
                isEdit
                    ? "UPDATE FEE TYPE SUBMIT:"
                    : "CREATE FEE TYPE SUBMIT:",
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
                    ? "UPDATE FEE TYPE RESPONSE:"
                    : "CREATE FEE TYPE RESPONSE:",
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
                        ? "Failed to update fee type"
                        : "Failed to create fee type"
                );
            }

            onSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : isEdit
                        ? "Failed to update fee type"
                        : "Failed to create fee type"
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
                            {isEdit ? "Edit Fee Type" : "Create Fee Type"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Update fee type information."
                                : "Add a new fee type."}
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
                                Name
                            </label>

                            <input
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="description">
                                Description
                            </label>

                            <input
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="branch">
                                Branch
                            </label>

                            <input
                                id="branch"
                                name="branch"
                                type="number"
                                value={form.branch}
                                onChange={handleChange}
                                required
                            />
                        </div>      

                        <div className="form-field full">
                            <label htmlFor="amount">
                                Amount
                            </label>

                            <input
                                id="amount"
                                name="amount"
                                type="number"
                                value={form.amount}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field checkbox-field">
                            <input
                                id="is_recurring"
                                name="is_recurring"
                                type="checkbox"
                                checked={form.is_recurring}
                                onChange={handleChange}
                            />
                            <label htmlFor="is_recurring">
                                Is Recurring
                            </label>
                        </div>

                        <div className="form-field checkbox-field">
                            <input
                                id="is_active"
                                name="is_active"
                                type="checkbox"
                                checked={form.is_active}
                                onChange={handleChange}
                            />
                            <label htmlFor="is_active">
                                Is Active
                            </label>
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
                                    : "Creating..."
                                : isEdit
                                    ? "Save Changes"
                                    : "Create Fee Type"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
