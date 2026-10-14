"use client";

import styles from "./FeeTypeForm.module.css";
import { Wallet, X } from "lucide-react";
import { loadClassOptions } from "@/lib/classOptions";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    return getClassIds(feeType?.class_ids ?? feeType?.classes);
  });
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (response.status === 401) { router.push("/login"); return; }
        if (!response.ok) throw new Error("Gagal memuat sesi pengguna.");
        const session = await response.json();
        const branchId = session.user?.branch_id;
        if (!Number.isInteger(branchId) || branchId <= 0) {
          throw new Error("Tidak ada cabang sekolah yang terhubung dengan akun Anda.");
        }
        if (controller.signal.aborted) return;
        setForm((current) => ({ ...current, branch: branchId }));
        setClassesLoading(true);
        try {
          const records = await loadClassOptions();
          if (!controller.signal.aborted) setClasses(records);
        } catch {
          if (!controller.signal.aborted) setClassesError("Gagal memuat kelas.");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) setBranchesError(loadError instanceof Error ? loadError.message : "Gagal memuat cabang.");
      } finally {
        if (!controller.signal.aborted) {
          setBranchesLoading(false);
          setClassesLoading(false);
        }
      }
    }
    void loadOptions();
    return () => controller.abort();
  }, [router]);

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
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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

    if (branchesLoading || classesLoading || branchesError || classesError || !form.branch) {
      setError("Cabang dan kelas belum tersedia. Silakan buka kembali form.");
      return;
    }
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
      <div className={`modal ${styles.modal}`} role="dialog" aria-modal="true" aria-labelledby="fee-type-title">
        <div className={styles.header}>
          <span className={styles.icon}><Wallet aria-hidden="true" /></span>
          <div>
            <h2 id="fee-type-title">{isEdit ? "Edit Jenis Biaya" : "Tambah Jenis Biaya"}</h2>
            <p>Atur biaya sekolah dan pilih kelas yang dikenakan biaya.</p>
          </div>
          <button type="button" className={styles.close} aria-label="Tutup" onClick={onCancel}><X aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {error && <p className="form-error" role="alert">{error}</p>}
            {branchesError && <p className="form-error" role="alert">{branchesError}</p>}
            <section className={styles.section} aria-labelledby="fee-information">
              <h3 id="fee-information">Informasi biaya</h3>
              <div className={styles.grid}>
                <div className="form-field">
                  <label htmlFor="name">Nama biaya <span className={styles.required}>*</span></label>
                  <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Contoh: SPP bulanan" required />
                </div>
                <div className="form-field">
                  <label htmlFor="amount">Jumlah <span className={styles.required}>*</span></label>
                  <div className={styles.amount}>
                    <span>Rp</span>
                    <input id="amount" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={handleChange} placeholder="250000" required />
                  </div>
                </div>
                <div className={`form-field ${styles.full}`}>
                  <label htmlFor="description">Deskripsi <span className={styles.required}>*</span></label>
                  <textarea id="description" name="description" rows={2} value={form.description} onChange={handleChange} placeholder="Jelaskan tujuan atau rincian biaya ini..." required />
                </div>
              </div>
            </section>
            <section className={styles.section} aria-labelledby="fee-classes">
              <div className={styles.sectionHeading}>
                <div><h3 id="fee-classes">Kelas penerima</h3><p>Pilih kelas yang dikenakan biaya ini.</p></div>
                <span className={styles.count}>{classes.filter((item) => selectedClassIds.includes(String(item.id))).length} dipilih</span>
              </div>
              <div className={styles.classGrid}>
                {branchesLoading || classesLoading ? <p className={styles.empty}>Memuat kelas...</p>
                  : classes.length === 0 ? <p className={styles.empty}>Tidak ada kelas tersedia.</p>
                  : classes.map((schoolClass) => {
                    const classId = String(schoolClass.id);
                    const selected = selectedClassIds.includes(classId);
                    return <label key={classId} className={`${styles.classOption} ${selected ? styles.selected : ""}`}>
                      <input type="checkbox" checked={selected} disabled={!form.branch} onChange={(event) => setSelectedClassIds((current) => event.target.checked ? [...current, classId] : current.filter((id) => id !== classId))} />
                      <span>{schoolClass.class_name ?? schoolClass.name ?? schoolClass.label ?? `Kelas ${classId}`}</span>
                    </label>;
                  })}
              </div>
              {classesError && <p className="form-error" role="alert">{classesError}</p>}
            </section>
            <section className={styles.section} aria-labelledby="fee-options">
              <h3 id="fee-options">Pengaturan biaya</h3>
              <label className={styles.setting}>
                <span><strong>Biaya berulang</strong><small>Dikenakan secara berkala sesuai frekuensi.</small></span>
                <input name="is_recurring" type="checkbox" role="switch" checked={form.is_recurring} onChange={handleChange} />
              </label>
              {form.is_recurring && <div className={`form-field ${styles.frequency}`}>
                <label htmlFor="recurring_frequency">Frekuensi</label>
                <select id="recurring_frequency" name="recurring_frequency" value={form.recurring_frequency} onChange={handleChange} required>
                  <option value="monthly">Bulanan</option><option value="quarterly">Triwulanan</option><option value="annually">Tahunan</option>
                </select>
              </div>}
              <label className={styles.setting}>
                <span><strong>Aktif</strong><small>Jenis biaya tersedia untuk pembuatan tagihan.</small></span>
                <input name="is_active" type="checkbox" role="switch" checked={form.is_active} onChange={handleChange} />
              </label>
            </section>
          </div>
          <div className={styles.footer}>
            <button type="button" className="button-secondary" onClick={onCancel} disabled={loading}>Batal</button>
            <button type="submit" className="button-primary" disabled={loading || branchesLoading || classesLoading || !!branchesError || !!classesError || !form.branch}>
              {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Jenis Biaya"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
