"use client";

import { FormEvent, useEffect, useState } from "react";

type FeeType = {
  id: number;
  name: string;
};

type SchoolClass = {
  id: number;
  class_name: string;
};

type Student = {
  id: number | string;
  name: string;
};

type GenerateInvoiceFormProps = {
  feeType: FeeType;
  classes: SchoolClass[];
  onSuccess: () => void;
  onCancel: () => void;
};

type StudentRecord = {
  id?: number | string;
  student_id?: number | string;
  name?: string;
  student_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
};

function normalizeStudents(data: unknown): Student[] {
  const records = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: StudentRecord[] }).results
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { data?: unknown }).data)
        ? (data as { data: StudentRecord[] }).data
        : [];

  return (records as StudentRecord[])
    .map((student) => ({
      id: student.id ?? student.student_id ?? "",
      name:
        student.student_name ??
        student.name ??
        [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(" "),
    }))
    .filter((student) => student.id !== "" && student.name);
}

export default function GenerateInvoiceForm({
  feeType,
  classes,
  onSuccess,
  onCancel,
}: GenerateInvoiceFormProps) {
  const [classId, setClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [form, setForm] = useState({
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    remark: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedStudentIds([]);
    setStudentSearch("");
    setStudents([]);
    setStudentsError("");

    if (!classId) return;

    const controller = new AbortController();

    async function loadStudents() {
      try {
        setStudentsLoading(true);
        const response = await fetch(
          `/api/proxy/class-students/?class_id=${encodeURIComponent(classId)}`,
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

        if (!response.ok) throw new Error("Gagal memuat data siswa");

        setStudents(normalizeStudents(await response.json()));
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        console.error(loadError);
        setStudentsError("Gagal memuat data siswa untuk kelas ini.");
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false);
      }
    }

    void loadStudents();
    return () => controller.abort();
  }, [classId]);

  const visibleStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/proxy/fee-types/${feeType.id}/generate-invoices/`,
        {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_date: form.invoiceDate,
          due_date: form.dueDate,
          remark: form.remark,
        }),
        },
      );

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        if (data && typeof data === "object") {
          const messages = Object.entries(data)
            .map(
              ([field, value]) =>
                `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
            )
            .join("\n");
          throw new Error(messages);
        }
        throw new Error("Gagal membuat tagihan");
      }

      onSuccess();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal membuat tagihan.",
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
            <h2>Buat Tagihan</h2>
            <p>{feeType.name}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="invoiceDate">Tanggal tagihan</label>
              <input
                id="invoiceDate"
                name="invoiceDate"
                type="date"
                value={form.invoiceDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="invoiceDueDate">Tanggal jatuh tempo</label>
              <input
                id="invoiceDueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field full">
              <label htmlFor="invoiceRemark">Catatan</label>
              <textarea
                id="invoiceRemark"
                name="remark"
                value={form.remark}
                onChange={handleChange}
                rows={3}
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
              disabled={
                loading || studentsLoading
              }
            >
              {loading ? "Membuat..." : "Buat Tagihan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
