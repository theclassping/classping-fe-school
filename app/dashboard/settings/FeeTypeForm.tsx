"use client";

import { FormEvent, useEffect, useState } from "react";

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
        branch: feeType ? String(feeType.branch) : "",
        is_recurring: feeType?.is_recurring ?? false,
        is_active: feeType?.is_active ?? true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(true);
    const [branchesError, setBranchesError] = useState("");
    const [branchRetry, setBranchRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        async function loadBranches() {
            setBranchesLoading(true);
            setBranchesError("");
            try {
                const options: { id: string; name: string }[] = [];
                let url = "/api/proxy/branches/";
                const visited = new Set<string>();
                while (url && !visited.has(url)) {
                    visited.add(url);
                    const response = await fetch(url, { credentials: "include", cache: "no-store", signal: controller.signal });
                    if (response.status === 401) { window.location.href = "/login"; return; }
                    if (!response.ok) throw new Error("Cabang sekolah gagal dimuat.");
                    const data = await response.json();
                    const records = Array.isArray(data) ? data : data.results ?? data.data ?? [];
                    for (const branch of records) {
                        if (branch.id != null && typeof branch.name === "string" &&
                            (branch.is_active !== false || String(branch.id) === String(feeType?.branch))) {
                            options.push({ id: String(branch.id), name: branch.name });
                        }
                    }
                    url = data.next ? `/api/proxy/branches/${new URL(data.next, window.location.origin).search}` : "";
                }
                if (!controller.signal.aborted) setBranches(options);
            } catch {
                if (!controller.signal.aborted) setBranchesError("Cabang sekolah gagal dimuat. Silakan coba lagi.");
            } finally {
                if (!controller.signal.aborted) setBranchesLoading(false);
            }
        }
        void loadBranches();
        return () => controller.abort();
    }, [feeType?.branch, branchRetry]);

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

            const body = { ...form, branch: Number(form.branch) };

            const response = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

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

                            <select
                                id="branch"
                                name="branch"
                                value={form.branch}
                                onChange={handleChange}
                                disabled={branchesLoading || !!branchesError || branches.length === 0}
                                required
                            >
                                <option value="">{branchesLoading ? "Memuat cabang..." : "Pilih cabang sekolah"}</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </select>
                            {branchesError && <p role="alert">{branchesError} <button type="button" className="button-secondary" onClick={() => setBranchRetry((value) => value + 1)}>Coba lagi</button></p>}
                            {!branchesLoading && !branchesError && branches.length === 0 && <p role="status">Belum ada cabang sekolah yang tersedia.</p>}
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
                            disabled={loading || branchesLoading || !!branchesError || !branches.some((branch) => branch.id === form.branch)}
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
