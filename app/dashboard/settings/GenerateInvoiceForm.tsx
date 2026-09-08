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
    dueDate: "",
    tax: "0",
    discount: "0",
    note: "",
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

        if (!response.ok) throw new Error("Failed to load students");

        setStudents(normalizeStudents(await response.json()));
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        )
          return;
        console.error(loadError);
        setStudentsError("Failed to load students for this class.");
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

    if (selectedStudentIds.length === 0) {
      setError("Select at least one student.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/proxy/student-invoices/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_type_id: feeType.id,
          class_id: Number(classId),
          student_ids: selectedStudentIds.map(Number),
          due_date: form.dueDate,
          tax: Number(form.tax),
          discount: Number(form.discount),
          note: form.note,
        }),
      });

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
        throw new Error("Failed to generate invoice");
      }

      onSuccess();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to generate invoice.",
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
            <h2>Generate invoice</h2>
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
              <label htmlFor="invoiceClass">Class</label>
              <select
                id="invoiceClass"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                required
              >
                <option value="">Select class</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full">
              <label htmlFor="invoiceStudentSearch">
                Students ({selectedStudentIds.length} selected)
              </label>
              <input
                id="invoiceStudentSearch"
                type="search"
                placeholder="Search student by name"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                disabled={!classId || studentsLoading}
              />
              <div className="student-checkbox-list">
                {studentsLoading ? (
                  <p>Loading students...</p>
                ) : visibleStudents.length > 0 ? (
                  visibleStudents.map((student) => (
                    <label key={student.id} className="student-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(
                          String(student.id),
                        )}
                        onChange={() => toggleStudent(String(student.id))}
                      />
                      <span>{student.name}</span>
                    </label>
                  ))
                ) : (
                  <p>
                    {classId ? "No students found." : "Select a class first."}
                  </p>
                )}
              </div>
              {studentsError && (
                <small className="form-error">{studentsError}</small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="invoiceDueDate">Due date</label>
              <input
                id="invoiceDueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="invoiceTax">Tax</label>
              <input
                id="invoiceTax"
                name="tax"
                type="number"
                min="0"
                step="0.01"
                value={form.tax}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="invoiceDiscount">Discount</label>
              <input
                id="invoiceDiscount"
                name="discount"
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={handleChange}
              />
            </div>

            <div className="form-field full">
              <label htmlFor="invoiceNote">Note</label>
              <textarea
                id="invoiceNote"
                name="note"
                value={form.note}
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
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={
                loading || studentsLoading || selectedStudentIds.length === 0
              }
            >
              {loading ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
