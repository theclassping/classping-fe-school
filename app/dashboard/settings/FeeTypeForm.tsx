"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadBranchesForCurrentSchool } from "../profile/branchApi";

type SchoolClass = {
  id: number;
  class_name?: string;
  name?: string;
  label?: string;
};

type Branch = {
  id: number;
  name?: string;
  branch_name?: string;
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
  fee_type_classes?: Array<{
    id?: number | string;
    class_obj?: number | string;
    class_id?: number | string;
  }>;
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
          class_obj?: number | string;
          class_id?: number | string;
        };

        return record.class_obj ?? record.class_id ?? record.id;
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
  const router = useRouter();

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    return getClassIds(feeType?.class_ids ?? feeType?.classes);
  });
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const initialBranch = useRef(form.branch);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBranches() {
      try {
        setBranchesLoading(true);
        setBranchesError("");

        const records = await loadBranchesForCurrentSchool(controller.signal);
        setBranches(records);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        if (
          loadError instanceof Error &&
          loadError.message === "Sesi berakhir. Silakan masuk kembali."
        ) {
          router.push("/login");
          return;
        }

        console.error(loadError);
        setBranchesError("Gagal memuat cabang.");
      } finally {
        if (!controller.signal.aborted) {
          setBranchesLoading(false);
        }
      }
    }

    void loadBranches();

    return () => controller.abort();
  }, [router]);

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
          throw new Error("Gagal memuat kelas");
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
        setClassesError("Gagal memuat kelas.");
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
          throw new Error("Gagal memuat detail jenis biaya");
        }

        const data = await response.json();
        const detail = data.data ?? data;
        const selectedClasses =
          detail.fee_type_classes ?? detail.class_ids ?? detail.classes ?? [];

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
          isEdit ? "Gagal memperbarui jenis biaya" : "Gagal membuat jenis biaya",
        );
      }

      onSuccess();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Gagal memperbarui jenis biaya"
            : "Gagal membuat jenis biaya",
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
            <h2>{isEdit ? "Edit Jenis Biaya" : "Tambah Jenis Biaya"}</h2>

            <p>
              {isEdit ? "Perbarui informasi jenis biaya." : "Tambahkan jenis biaya baru."}
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
              <label htmlFor="name">Nama</label>

              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Deskripsi</label>

              <input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="branch">Cabang</label>

              <select
                id="branch"
                name="branch"
                value={form.branch || ""}
                onChange={handleChange}
                disabled={branchesLoading}
                required
              >
                <option value="">
                  {branchesLoading ? "Memuat cabang..." : "Pilih cabang"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name ??
                      branch.branch_name ??
                      branch.label ??
                      `Cabang ${branch.id}`}
                  </option>
                ))}
              </select>

              {branchesError && (
                <small className="form-error">{branchesError}</small>
              )}
            </div>

            <div className="form-field full">
              <label>Kelas</label>

              <div className="student-checkbox-list">
                {classesLoading ? (
                  <span>Memuat kelas...</span>
                ) : classes.length === 0 ? (
                  <span>
                    {form.branch
                      ? "Tidak ada kelas untuk cabang ini"
                      : "Pilih cabang terlebih dahulu"}
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
                            `Kelas ${schoolClass.id}`}
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
              <label htmlFor="amount">Jumlah</label>

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
              <label htmlFor="currency">Mata uang</label>

              <input
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="recurring_frequency">Frekuensi berulang</label>

              <select
                id="recurring_frequency"
                name="recurring_frequency"
                value={form.recurring_frequency}
                onChange={handleChange}
                disabled={!form.is_recurring}
                required
              >
                <option value="monthly">Bulanan</option>
                <option value="quarterly">Triwulanan</option>
                <option value="annually">Tahunan</option>
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
              <label htmlFor="is_recurring">Biaya berulang</label>
            </div>

            <div className="form-field checkbox-field">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              <label htmlFor="is_active">Aktif</label>
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

            <button type="submit" className="button-primary" disabled={loading}>
              {loading
                ? isEdit
                  ? "Menyimpan..."
                  : "Membuat..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan Jenis Biaya"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
