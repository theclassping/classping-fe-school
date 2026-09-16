"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type SchoolClass = {
  id: number;
  class_name?: string;
  name?: string;
  label?: string;
};

type FeeType = {
  id: number;
  name: string;
  description: string;
  amount: number;
  currency?: string;
  branch: number;
  is_recurring: boolean;
  recurring_frequency?: string;
  is_active: boolean;
  classes?: Array<number | string | { id: number | string }>;
  class_ids?: Array<number | string>;
};

type FeeTypeFormProps = {
  feeType?: FeeType;
  onSuccess: () => void;
  onCancel: () => void;
};

function getClassIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        const record = item as {
          id?: number | string;
          class_id?: number | string;
        };

        return record.id ?? record.class_id;
      }

      return item;
    })
    .filter((id): id is number | string => id !== undefined && id !== null)
    .map(String);
}

export default function FeeTypeForm({
  feeType,
  onSuccess,
  onCancel,
}: FeeTypeFormProps) {
  const isEdit = !!feeType;

  const [form, setForm] = useState({
    name: feeType?.name ?? "",
    description: feeType?.description ?? "",
    amount: feeType?.amount?.toString() ?? "",
    currency: feeType?.currency ?? "IDR",
    branch: feeType?.branch ?? 0,
    is_recurring: feeType?.is_recurring ?? false,
    recurring_frequency: feeType?.recurring_frequency ?? "monthly",
    is_active: feeType?.is_active ?? true,
  });

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    return getClassIds(feeType?.class_ids ?? feeType?.classes);
  });
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const initialBranch = useRef(form.branch);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.branch) {
      setClasses([]);
      setSelectedClassIds([]);
      return;
    }

    if (form.branch !== initialBranch.current) {
      setSelectedClassIds([]);
    }

    initialBranch.current = form.branch;

    const controller = new AbortController();

    async function loadClasses() {
      try {
        setClassesLoading(true);
        setClassesError("");

        const response = await fetch(
          `/api/proxy/classes/?branch_id=${encodeURIComponent(String(form.branch))}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load classes");
        }

        const data = await response.json();
        const records = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : Array.isArray(data.data)
              ? data.data
              : [];

        setClasses(records);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error(loadError);
        setClassesError("Failed to load classes.");
      } finally {
        if (!controller.signal.aborted) {
          setClassesLoading(false);
        }
      }
    }

    void loadClasses();

    return () => controller.abort();
  }, [form.branch]);

  useEffect(() => {
    const feeTypeId = feeType?.id;

    if (!feeTypeId) {
      return;
    }

    const controller = new AbortController();

    async function loadFeeTypeClasses() {
      try {
        const response = await fetch(`/api/proxy/fee-types/${feeTypeId}/`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load fee type details");
        }

        const data = await response.json();
        const detail = data.data ?? data;
        const selectedClasses = detail.class_ids ?? detail.classes ?? [];

        setSelectedClassIds(getClassIds(selectedClasses));
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error(loadError);
      }
    }

    void loadFeeTypeClasses();

    return () => controller.abort();
  }, [feeType?.id]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

      const body = {
        branch: Number(form.branch),
        name: form.name,
        description: form.description,
        amount: form.amount,
        currency: form.currency,
        is_recurring: form.is_recurring,
        recurring_frequency: form.recurring_frequency,
        is_active: form.is_active,
        class_ids: selectedClassIds.map(Number),
      };

      console.log(
        isEdit ? "UPDATE FEE TYPE SUBMIT:" : "CREATE FEE TYPE SUBMIT:",
        body,
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
        isEdit ? "UPDATE FEE TYPE RESPONSE:" : "CREATE FEE TYPE RESPONSE:",
        {
          status: response.status,
          data,
        },
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
          isEdit ? "Failed to update fee type" : "Failed to create fee type",
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
            : "Failed to create fee type",
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
            <h2>{isEdit ? "Edit Fee Type" : "Create Fee Type"}</h2>

            <p>
              {isEdit ? "Update fee type information." : "Add a new fee type."}
            </p>
          </div>

          <button type="button" className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Name</label>

              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Description</label>

              <input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="branch">Branch</label>

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
              <label>Classes</label>

              <div className="student-checkbox-list">
                {classesLoading ? (
                  <span>Loading classes...</span>
                ) : classes.length === 0 ? (
                  <span>
                    {form.branch
                      ? "No classes found for this branch"
                      : "Enter a branch first"}
                  </span>
                ) : (
                  classes.map((schoolClass) => {
                    const classId = String(schoolClass.id);

                    return (
                      <label
                        key={schoolClass.id}
                        className="student-checkbox-item"
                        htmlFor={`fee-class-${schoolClass.id}`}
                      >
                        <input
                          id={`fee-class-${schoolClass.id}`}
                          type="checkbox"
                          checked={selectedClassIds.includes(classId)}
                          onChange={(event) => {
                            setSelectedClassIds((currentIds) =>
                              event.target.checked
                                ? [...currentIds, classId]
                                : currentIds.filter((id) => id !== classId),
                            );
                          }}
                          disabled={!form.branch}
                        />
                        <span>
                          {schoolClass.class_name ??
                            schoolClass.name ??
                            schoolClass.label ??
                            `Class ${schoolClass.id}`}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {classesError && (
                <small className="form-error">{classesError}</small>
              )}
            </div>

            <div className="form-field full">
              <label htmlFor="amount">Amount</label>

              <input
                id="amount"
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="currency">Currency</label>

              <input
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="recurring_frequency">Recurring Frequency</label>

              <select
                id="recurring_frequency"
                name="recurring_frequency"
                value={form.recurring_frequency}
                onChange={handleChange}
                disabled={!form.is_recurring}
                required
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-field checkbox-field">
              <input
                id="is_recurring"
                name="is_recurring"
                type="checkbox"
                checked={form.is_recurring}
                onChange={handleChange}
              />
              <label htmlFor="is_recurring">Is Recurring</label>
            </div>

            <div className="form-field checkbox-field">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              <label htmlFor="is_active">Is Active</label>
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

            <button type="submit" className="button-primary" disabled={loading}>
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
