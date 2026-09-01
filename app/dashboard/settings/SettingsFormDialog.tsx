"use client";

import { FormEvent, useState } from "react";

export type Field = {
    key: string;
    label: string;
    type?: "email" | "number" | "tel" | "textarea" | "select" | "text";
    options?: string[];
    full?: boolean;
};

type SettingsFormDialogProps = {
    title: string;
    fields: Field[];
    onCancel: () => void;
    onSave: (values: Record<string, string>) => void;
};

function initialValues(fields: Field[]) {
    return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

export default function SettingsFormDialog({
    title,
    fields,
    onCancel,
    onSave,
}: SettingsFormDialogProps) {
    const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields));

    function updateValue(key: string, value: string) {
        setValues((current) => ({ ...current, [key]: value }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSave(values);
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                    </div>

                    <button type="button" className="modal-close" onClick={onCancel}>
                        ×
                    </button>
                </div>

                <form className="setting-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {fields.map((field) => (
                            <div key={field.key} className={`field-group ${field.full ? "full" : ""}`}>
                                <label htmlFor={field.key}>{field.label}</label>

                                {field.type === "textarea" ? (
                                    <textarea
                                        id={field.key}
                                        value={values[field.key]}
                                        onChange={(event) => updateValue(field.key, event.target.value)}
                                    />
                                ) : field.type === "select" ? (
                                    <select
                                        id={field.key}
                                        value={values[field.key]}
                                        onChange={(event) => updateValue(field.key, event.target.value)}
                                    >
                                        <option value="">Select an option</option>
                                        {field.options?.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id={field.key}
                                        type={field.type ?? "text"}
                                        value={values[field.key]}
                                        onChange={(event) => updateValue(field.key, event.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="button-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="button-primary">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
