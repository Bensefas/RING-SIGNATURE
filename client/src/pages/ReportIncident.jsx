import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, CircleAlert, CircleCheck, ClipboardList, Paperclip, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";
import {
  buildAnonymousRing,
  getAnonymousLinkabilityScope,
  getAnonymousSigningKey,
  signAnonymousIncident,
} from "../lib/anonymousRingSignature";
import { createIncidentNonce, hashIncidentReport } from "../lib/incidentSignaturePayload";
import {
  getDigitalSigningKey,
  publicJwkFromKeyPair,
  signIncidentHash,
} from "../lib/digitalReportSignature";

const API_URL = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");
const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getEvidenceUploadErrorMessage = (error) => {
  const serverMessage = error.response?.data?.message;
  if (serverMessage && /fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND/i.test(serverMessage)) {
    return "IPFS evidence storage is unavailable. Your report is saved; start IPFS, then retry the evidence upload.";
  }
  if (!error.response && /network error|failed to fetch/i.test(error.message || "")) {
    return "The reporting server could not be reached. Your report is saved; retry the evidence upload when the server is available.";
  }
  return serverMessage || error.message || "Evidence upload failed.";
};

function ReportIncident({ user, onLogout, onBack, onNavigate, onSubmitted }) {
  const accountId = user?.user_id || user?.userId || user?.id;
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    incident_location: "",
    incident_date: "",
    priority: "Medium",
    anonymity: false,
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploadedEvidenceFiles, setUploadedEvidenceFiles] = useState([]);
  const [pendingIncidentId, setPendingIncidentId] = useState(null);
  const [anonymousRingStatus, setAnonymousRingStatus] = useState({
    loading: false,
    count: null,
    error: "",
  });
  const anonymousSubmissionBlocked = form.anonymity && (
    anonymousRingStatus.loading
    || (anonymousRingStatus.count !== null && anonymousRingStatus.count < 2)
    || (anonymousRingStatus.count === null && !anonymousRingStatus.error)
  );
  const anonymousSecurityMessage = !form.anonymity
    ? "Your private digital-signing key stays in this browser. The server verifies your signature and stores its public key with the report."
    : anonymousRingStatus.loading
      ? "Enrolling your browser-held anonymous key and checking the reporter ring..."
      : anonymousRingStatus.error
        ? `Anonymous key enrollment failed: ${anonymousRingStatus.error}`
        : anonymousRingStatus.count === null
          ? "Select anonymous reporting to enroll your key before submitting."
          : anonymousRingStatus.count < 2
            ? `Only ${anonymousRingStatus.count} active reporter key${anonymousRingStatus.count === 1 ? " is" : "s are"} available. Ask another active reporter to select anonymous reporting from their own account and enroll a key before submitting anonymously.`
            : `Anonymous ring ready with ${anonymousRingStatus.count} active reporter keys. Your private key stays in this browser; clearing its data requires re-enrollment.`;

  /*
   * ============================================================
   * LOAD INCIDENT CATEGORIES
   * ============================================================
   */
  async function loadCategories() {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your login session has expired. Please login again.");
      return;
    }

    try {
      setLoadingCategories(true);

      const response = await axios.get(
        `${API_URL}/incidents/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Categories response:", response.data);

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data.categories)) {
        data = response.data.categories;
      }

      setCategories(data);

      if (data.length === 0) {
        setError("No incident categories were found.");
      }
    } catch (err) {
      console.error("Category loading error:", err);

      if (err.response?.status === 401) {
        setError(
          "Your authentication session is invalid. Please logout and login again."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load incident categories."
        );
      }
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void loadCategories(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!form.anonymity) return undefined;

    let active = true;
    const token = localStorage.getItem("token");

    const enrollAnonymousKey = async () => {
      try {
        if (!token) throw new Error("Your login session has expired.");
        if (!accountId) throw new Error("Your account ID is unavailable; please sign in again.");

        const keyPair = await getAnonymousSigningKey(accountId);
        const headers = { Authorization: `Bearer ${token}` };
        await axios.post(
          `${API_URL}/anonymous/public-keys`,
          { publicKey: keyPair.publicKey },
          { headers }
        );
        const response = await axios.get(`${API_URL}/anonymous/eligible-keys`, { headers });
        const eligibleKeys = response.data?.keys || response.data?.data || [];
        const ring = buildAnonymousRing(Array.isArray(eligibleKeys) ? eligibleKeys : []);

        if (active) {
          setAnonymousRingStatus({ loading: false, count: ring.length, error: "" });
        }
      } catch (enrollmentError) {
        if (active) {
          setAnonymousRingStatus({
            loading: false,
            count: null,
            error: enrollmentError.response?.data?.message
              || enrollmentError.message
              || "Unable to enroll your anonymous signing key.",
          });
        }
      }
    };

    void enrollAnonymousKey();
    return () => {
      active = false;
    };
  }, [accountId, form.anonymity]);

  /*
   * ============================================================
   * FORM CHANGE
   * ============================================================
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "anonymity") {
      setAnonymousRingStatus(checked
        ? { loading: true, count: null, error: "" }
        : { loading: false, count: null, error: "" });
    }

    setError("");
    setMessage("");
  };

  const handleEvidenceFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    setError("");

    if (evidenceFiles.length + selectedFiles.length > MAX_EVIDENCE_FILES) {
      setError(`Attach no more than ${MAX_EVIDENCE_FILES} evidence files.`);
      return;
    }

    const invalidFile = selectedFiles.find((file) => !ALLOWED_EVIDENCE_TYPES.has(file.type));
    if (invalidFile) {
      setError(`${invalidFile.name} is not a supported file type. Use PDF, JPG, PNG, or WebP.`);
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_EVIDENCE_FILE_SIZE);
    if (oversizedFile) {
      setError(`${oversizedFile.name} exceeds the 10 MB per-file limit.`);
      return;
    }

    setEvidenceFiles((currentFiles) => [...currentFiles, ...selectedFiles]);
  };

  const uploadEvidenceFiles = async (incidentId, token) => {
    const uploaded = new Set(uploadedEvidenceFiles);
    const failedFiles = [];

    for (const file of evidenceFiles) {
      if (uploaded.has(file)) continue;

      const formData = new FormData();
      formData.append("incident_id", incidentId);
      formData.append("evidence", file);

      try {
        const response = await axios.post(`${API_URL}/evidence/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.success !== true) {
          throw new Error(response.data?.message || "The server did not confirm the upload.");
        }
        uploaded.add(file);
      } catch (uploadError) {
        failedFiles.push({
          name: file.name,
          message: getEvidenceUploadErrorMessage(uploadError),
        });
        if (uploadError.response?.status === 401) break;
      }
    }

    setUploadedEvidenceFiles(Array.from(uploaded));
    return failedFiles;
  };

  const finishReportSubmission = (submissionMessage) => {
    const attachmentMessage = evidenceFiles.length
      ? ` ${evidenceFiles.length} evidence file${evidenceFiles.length === 1 ? "" : "s"} attached.`
      : "";
    const finalMessage = `${submissionMessage}${attachmentMessage}`;

    setForm({
      title: "",
      category_id: "",
      description: "",
      incident_location: "",
      incident_date: "",
      priority: "Medium",
      anonymity: false,
    });
    setEvidenceFiles([]);
    setUploadedEvidenceFiles([]);
    setPendingIncidentId(null);
    setMessage(finalMessage);
    setError("");
    if (typeof onSubmitted === "function") onSubmitted(finalMessage);
  };

  /*
   * ============================================================
   * SUBMIT INCIDENT
   * ============================================================
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setError("");
    setMessage("");

    if (pendingIncidentId) {
      setSubmitting(true);
      try {
        const failedFiles = await uploadEvidenceFiles(pendingIncidentId, token);
        if (failedFiles.length) {
          setError(
            `Report ${pendingIncidentId} was saved, but some evidence files are still pending. ${failedFiles.map((file) => `${file.name}: ${file.message}`).join(" ")} Retry the upload without submitting the report again.`
          );
          return;
        }
        finishReportSubmission(`Evidence was attached to your submitted report ${pendingIncidentId}.`);
      } catch (uploadError) {
        setError(getEvidenceUploadErrorMessage(uploadError));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (anonymousSubmissionBlocked) {
      setError(
        anonymousRingStatus.count !== null
          ? "Anonymous submission is not ready: at least two active reporter keys are required. Ask another active reporter to enroll a key from their own account, then try again."
          : "Your anonymous signing key is still being prepared. Please wait and try again."
      );
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter the incident title.");
      return;
    }

    if (!form.category_id) {
      setError("Please select an incident category.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please describe the incident.");
      return;
    }

    if (!form.incident_location.trim()) {
      setError("Please enter the incident location.");
      return;
    }

    if (!form.incident_date) {
      setError("Please select the incident date.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        description: form.description.trim(),
        incident_location: form.incident_location.trim(),
        incident_date: new Date(
          form.incident_date
        ).toISOString(),
        priority: form.priority,
        anonymity: form.anonymity,
        nonce: createIncidentNonce(),
      };

      if (form.anonymity) {
        if (!accountId) throw new Error("Your account ID is unavailable; please sign in again.");
        const keyPair = await getAnonymousSigningKey(accountId);
        await axios.post(
          `${API_URL}/anonymous/public-keys`,
          { publicKey: keyPair.publicKey },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const eligibleKeysResponse = await axios.get(
          `${API_URL}/anonymous/eligible-keys`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const ring = buildAnonymousRing(
          eligibleKeysResponse?.data?.keys || eligibleKeysResponse?.data?.data || []
        );
        const reportHash = await hashIncidentReport(payload);
        const signaturePayload = signAnonymousIncident({
          reportHash,
          ring,
          keyPair,
          scope: getAnonymousLinkabilityScope(payload.category_id),
        });

        const response = await axios.post(
          `${API_URL}/incidents/anonymous`,
          {
            report: payload,
            ringSignature: signaturePayload.signature,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.success === false) {
          throw new Error(response.data.message || "Anonymous report submission failed.");
        }

        const incidentId = response.data?.data?.incident?.incident_id
          || response.data?.incident?.incident_id;
        if (evidenceFiles.length && !incidentId) {
          setError("The anonymous report was submitted, but the server did not return its case ID, so evidence could not be attached. Do not resubmit the report; contact an administrator.");
          return;
        }
        if (evidenceFiles.length) {
          setPendingIncidentId(incidentId);
          const failedFiles = await uploadEvidenceFiles(incidentId, token);
          if (failedFiles.length) {
            setMessage("");
            setError(
              `Report ${incidentId} was saved, but some evidence files are still pending. ${failedFiles.map((file) => `${file.name}: ${file.message}`).join(" ")} Retry the upload without submitting the report again.`
            );
            return;
          }
        }

        const duplicateNotice = response.data?.data?.duplicateSignerDetected
          ? " This key has submitted another report in this category and reporting year."
          : "";
        const blockchainNotice = response.data?.data?.blockchainWarning
          ? ` ${response.data.data.blockchainWarning}`
          : "";
        finishReportSubmission(
          `Anonymous ring signature verified. Your identity is hidden from case handlers.${duplicateNotice}${blockchainNotice}`
        );
        return;
      }

      if (!accountId) throw new Error("Your account ID is unavailable; please sign in again.");
      const keyPair = await getDigitalSigningKey(accountId);
      const publicKey = publicJwkFromKeyPair(keyPair);
      await axios.put(
        `${API_URL}/incidents/digital-signature/public-key`,
        { publicKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const reportHash = await hashIncidentReport(payload);
      const signature = await signIncidentHash({ reportHash, keyPair });

      const response = await axios.post(
        `${API_URL}/incidents`,
        { ...payload, reportHash, signature },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Incident submission failed."
        );
      }

      const blockchainNotice = response.data?.blockchainWarning
        ? ` ${response.data.blockchainWarning}`
        : "";
      const incidentId = response.data?.incident?.incident_id
        || response.data?.data?.incident_id;
      if (evidenceFiles.length && !incidentId) {
        setError("The report was submitted, but the server did not return its case ID, so evidence could not be attached. Do not resubmit the report; contact an administrator.");
        return;
      }
      if (evidenceFiles.length) {
        setPendingIncidentId(incidentId);
        const failedFiles = await uploadEvidenceFiles(incidentId, token);
        if (failedFiles.length) {
          setMessage("");
          setError(
            `Report ${incidentId} was saved, but some evidence files are still pending. ${failedFiles.map((file) => `${file.name}: ${file.message}`).join(" ")} Retry the upload without submitting the report again.`
          );
          return;
        }
      }
      finishReportSubmission(
        `${response.data?.message || "Incident digitally signed and submitted successfully."}${blockchainNotice}`
      );
    } catch (err) {
      console.error("Incident submission error:", err);

      if (err.response?.status === 401) {
        setError(
          "Authentication failed. Please logout and login again."
        );
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to submit the incident."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * BACK TO DASHBOARD
   * ============================================================
   */
  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (typeof onNavigate === "function") {
      onNavigate("dashboard");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div className="report-incident-page" style={styles.page}>

      <main style={styles.main}>

        <div className="report-form-header" style={styles.header}>

          <div>
            <h1 style={styles.heading}>
              Report an Incident
            </h1>

            <p style={styles.subtitle}>
              Submit a secure incident report to the university.
            </p>
          </div>

          <button
            type="button"
            style={styles.backButton}
            onClick={handleBack}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to dashboard
          </button>

        </div>

        {/* USER INFORMATION */}

        {user && (
          <div style={styles.userBox}>
            <strong>
              Reporting as:
            </strong>{" "}
            {user.first_name || ""}{" "}
            {user.last_name || ""}

            {user.email && (
              <span style={styles.userEmail}>
                {user.email}
              </span>
            )}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div style={styles.successBox}>

            <div style={styles.messageIcon}>
              <CircleCheck size={20} aria-hidden="true" />
            </div>

            <div>
              <strong>
                Report submitted
              </strong>

              <p style={styles.messageParagraph}>
                {message}
              </p>
            </div>

          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div style={styles.errorBox}>

            <div style={styles.messageIcon}>
              <CircleAlert size={20} aria-hidden="true" />
            </div>

            <div>
              <strong>
                Notice
              </strong>

              <p style={styles.messageParagraph}>
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ====================================================
            INCIDENT FORM
        ==================================================== */}

        <form onSubmit={handleSubmit}>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>
                <Paperclip size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 style={styles.cardTitle}>Attach Evidence</h2>
                <p style={styles.cardSubtitle}>
                  Add supporting files now or before submitting. Up to {MAX_EVIDENCE_FILES} files, PDF/JPG/PNG/WebP, 10 MB each.
                </p>
              </div>
            </div>

            <label htmlFor="incident-evidence-files" style={styles.evidencePicker}>
              <Paperclip size={18} aria-hidden="true" />
              <span style={styles.evidencePickerText}>
                <strong>Choose files to attach</strong>
                <small>Tap here or use the file picker below</small>
              </span>
              <span style={styles.evidenceBrowse}>Browse files</span>
            </label>
            <input
              id="incident-evidence-files"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleEvidenceFilesChange}
              disabled={Boolean(pendingIncidentId)}
              style={styles.evidenceInput}
            />
            {evidenceFiles.length > 0 && (
              <ul style={styles.evidenceFileList}>
                {evidenceFiles.map((file, index) => {
                  const uploaded = uploadedEvidenceFiles.includes(file);
                  return (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      style={styles.evidenceFileRow}
                    >
                      <Paperclip size={15} aria-hidden="true" />
                      <span style={styles.evidenceFileName}>{file.name}</span>
                      <span style={styles.evidenceFileStatus}>
                        {uploaded ? "Uploaded" : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {pendingIncidentId && (
              <p style={styles.evidencePending}>
                Report {pendingIncidentId} is saved. Retry the upload to finish attaching the selected evidence.
              </p>
            )}
          </section>

          {/* INCIDENT INFORMATION */}

          <section style={styles.card}>

            <div style={styles.cardHeader}>

              <div style={styles.cardIcon}>
                <ClipboardList size={20} aria-hidden="true" />
              </div>

              <div>

                <h2 style={styles.cardTitle}>
                  Incident Information
                </h2>

                <p style={styles.cardSubtitle}>
                  Provide the basic details of what happened.
                </p>

              </div>

            </div>

            {/* TITLE */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Incident Title{" "}
                <span style={styles.required}>
                  *
                </span>
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Student Harassment"
                style={styles.input}
              />

            </div>

            {/* CATEGORY + PRIORITY */}

            <div className="report-form-columns" style={styles.twoColumns}>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Category{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loadingCategories}
                >

                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {categories.map((category) => {

                    const categoryId =
                      category.category_id ??
                      category.id;

                    const categoryName =
                      category.category_name ??
                      category.name ??
                      category.category;

                    return (
                      <option
                        key={categoryId}
                        value={categoryId}
                      >
                        {categoryName}
                      </option>
                    );
                  })}

                </select>

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Priority
                </label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  style={styles.input}
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Critical">
                    Critical
                  </option>

                </select>

              </div>

            </div>

            {/* LOCATION + DATE */}

            <div className="report-form-columns" style={styles.twoColumns}>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Incident Location{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="incident_location"
                  value={form.incident_location}
                  onChange={handleChange}
                  placeholder="Example: University Library"
                  style={styles.input}
                />

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Incident Date{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="datetime-local"
                  name="incident_date"
                  value={form.incident_date}
                  onChange={handleChange}
                  style={styles.input}
                />

              </div>

            </div>

            {/* DESCRIPTION */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Description{" "}
                <span style={styles.required}>
                  *
                </span>
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what happened, including any relevant details..."
                rows={7}
                style={{
                  ...styles.input,
                  resize: "vertical",
                  minHeight: "150px",
                }}
              />

              <p style={styles.helper}>
                Provide enough information to help the university
                understand and investigate the incident.
              </p>

            </div>

          </section>

          {/* ==================================================
              PRIVACY OPTIONS
          ================================================== */}

          <section style={styles.card}>

            <div style={styles.cardHeader}>

              <div
                style={{
                  ...styles.cardIcon,
                  ...styles.privacyIcon,
                }}
              >
                <ShieldCheck size={20} aria-hidden="true" />
              </div>

              <div>

                <h2 style={styles.cardTitle}>
                  Privacy Options
                </h2>

                <p style={styles.cardSubtitle}>
                  Choose whether your identity should be hidden
                  from ordinary report viewers.
                </p>

              </div>

            </div>

            <label style={styles.checkboxContainer}>

              <input
                type="checkbox"
                name="anonymity"
                checked={form.anonymity}
                onChange={handleChange}
                style={styles.checkbox}
              />

              <div>

                <strong style={styles.checkboxTitle}>
                  Submit anonymously
                </strong>

                <p style={styles.checkboxText}>
                  {form.anonymity
                    ? "Case handlers can view the case, but your identity is hidden. Trusted system records retain your account link; reports are linkable only within the same category and reporting year."
                    : "Your identity is visible to authorized case handlers. A digital signature verifies the report was signed with your account's browser-held key."}
                </p>

              </div>

            </label>

            <div
              id="anonymous-ring-status"
              role="status"
              aria-live="polite"
              style={form.anonymity && anonymousRingStatus.count !== null && anonymousRingStatus.count < 2
                ? styles.securityWarning
                : styles.securityInfo}
            >
              {anonymousSecurityMessage}
            </div>

          </section>

          {/* ==================================================
              ACTION BUTTONS
          ================================================== */}

          <div className="report-form-actions" style={styles.actions}>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={handleBack}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: submitting ? 0.7 : 1,
              }}
              disabled={submitting}
              aria-describedby={form.anonymity ? "anonymous-ring-status" : undefined}
            >
              {submitting
                ? pendingIncidentId ? "Uploading evidence..." : "Submitting..."
                : pendingIncidentId
                  ? "Retry Evidence Upload"
                  : anonymousSubmissionBlocked
                    ? "Check anonymous eligibility"
                  : evidenceFiles.length
                    ? "Submit Report & Evidence"
                    : "Submit Incident"}
            </button>

          </div>

        </form>

      </main>

      </div>
    </Layout>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = {
  page: {
    minHeight: "calc(100vh - 128px)",
    width: "100%",
    boxSizing: "border-box",
    padding: "clamp(18px, 3vw, 34px)",
    borderRadius: "18px",
    background: "#050819",
    color: "#F1F5F9",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0b3550 0%, #123c69 55%, #155e75 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
  },

  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "24px 20px",
    borderBottom: "1px solid #1e293b",
  },

  logo: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2dd4bf, #2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "16px",
  },

  logoTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
  },

  logoSubtitle: {
    margin: "2px 0 0",
    fontSize: "12px",
    color: "#94a3b8",
  },

  nav: {
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  navItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    padding: "12px 14px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    cursor: "pointer",
    textAlign: "left",
  },

  activeNav: {
    backgroundColor: "rgba(45, 212, 191, 0.22)",
    border: "1px solid rgba(153, 246, 228, 0.3)",
    color: "#ffffff",
  },

  sidebarBottom: {
    marginTop: "auto",
    padding: "12px",
    borderTop: "1px solid #1e293b",
  },

  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
    padding: "0 0 18px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "24px",
  },

  heading: {
    margin: 0,
    fontSize: "clamp(28px, 4vw, 38px)",
    fontWeight: "700",
    letterSpacing: "-0.7px",
    color: "#F1F5F9",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#94A3B8",
    fontSize: "14px",
  },

  backButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexShrink: 0,
    border: "1px solid #1E293B",
    backgroundColor: "#070D20",
    color: "#F1F5F9",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  userBox: {
    background: "#070D20",
    border: "1px solid #1E293B",
    color: "#E2E8F0",
    padding: "14px 16px",
    borderRadius: "10px",
    marginBottom: "18px",
    fontSize: "13px",
  },

  userEmail: {
    marginLeft: "10px",
    color: "#94A3B8",
  },

  card: {
    backgroundColor: "#10192D",
    border: "1px solid #1E293B",
    borderRadius: "14px",
    padding: "clamp(18px, 3vw, 26px)",
    marginBottom: "18px",
    boxShadow: "0 12px 26px rgba(0, 0, 0, 0.18)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "25px",
  },

  evidenceInput: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: "9px",
    marginTop: "10px",
    padding: "12px",
    backgroundColor: "#070D20",
    color: "#CBD5E1",
    fontSize: "13px",
    cursor: "pointer",
  },

  evidencePicker: {
    display: "flex",
    minHeight: "66px",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    border: "1px dashed #00AD81",
    borderRadius: "10px",
    backgroundColor: "rgba(0, 201, 149, 0.06)",
    color: "#76E7C6",
    cursor: "pointer",
  },

  evidencePickerText: {
    display: "grid",
    flex: 1,
    gap: "3px",
    minWidth: 0,
    color: "#F1F5F9",
    fontSize: "13px",
  },

  evidenceBrowse: {
    flexShrink: 0,
    border: "1px solid #00AD81",
    borderRadius: "7px",
    padding: "8px 10px",
    color: "#76E7C6",
    fontSize: "12px",
    fontWeight: "700",
  },

  evidenceFileList: {
    display: "grid",
    gap: "8px",
    margin: "12px 0 0",
    padding: 0,
    listStyle: "none",
  },

  evidenceFileRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "8px",
    padding: "9px 10px",
    border: "1px solid #1E293B",
    borderRadius: "8px",
    backgroundColor: "#070D20",
    color: "#CBD5E1",
    fontSize: "12px",
  },

  evidenceFileName: {
    minWidth: 0,
    flex: 1,
    overflowWrap: "anywhere",
  },

  evidenceFileStatus: {
    flexShrink: 0,
    color: "#94A3B8",
    fontSize: "11px",
  },

  evidencePending: {
    margin: "10px 0 0",
    color: "#FBBF24",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  cardIcon: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    borderRadius: "11px",
    background: "rgba(0, 201, 149, 0.12)",
    color: "#00C995",
    display: "grid",
    placeItems: "center",
  },

  privacyIcon: {
    background: "rgba(251, 191, 36, 0.12)",
    color: "#FBBF24",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#F1F5F9",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#94A3B8",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  formGroup: {
    marginBottom: "20px",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#CBD5E1",
  },

  required: {
    color: "#EF233C",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #334155",
    borderRadius: "9px",
    padding: "13px 14px",
    fontSize: "14px",
    lineHeight: 1.45,
    color: "#F1F5F9",
    backgroundColor: "#070D20",
    outline: "none",
  },

  helper: {
    margin: "6px 0 0",
    color: "#94A3B8",
    fontSize: "11px",
    lineHeight: 1.55,
  },

  securityWarning: {
    marginTop: "15px",
    padding: "12px",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    color: "#FCD34D",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: 1.55,
  },

  checkboxContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "16px",
    border: "1px solid #334155",
    borderRadius: "10px",
    cursor: "pointer",
    background: "#070D20",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    marginTop: "2px",
    cursor: "pointer",
    accentColor: "#00C995",
  },

  checkboxTitle: {
    display: "block",
    fontSize: "13px",
    color: "#F1F5F9",
  },

  checkboxText: {
    margin: "5px 0 0",
    color: "#94A3B8",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  securityInfo: {
    marginTop: "15px",
    padding: "12px",
    backgroundColor: "rgba(0, 201, 149, 0.08)",
    border: "1px solid rgba(0, 201, 149, 0.24)",
    color: "#76E7C6",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: 1.55,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "10px",
    marginBottom: "30px",
  },

  cancelButton: {
    border: "1px solid #334155",
    backgroundColor: "#070D20",
    color: "#CBD5E1",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  submitButton: {
    border: "none",
    background: "#00C995",
    color: "#04251C",
    padding: "13px 24px",
    borderRadius: "9px",
    boxShadow: "0 8px 18px rgba(0, 201, 149, 0.14)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  successBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "rgba(0, 201, 149, 0.1)",
    border: "1px solid rgba(0, 201, 149, 0.34)",
    color: "#9AF0D6",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "20px",
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "rgba(239, 35, 60, 0.1)",
    border: "1px solid rgba(239, 35, 60, 0.34)",
    color: "#FF9DAA",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "20px",
  },

  messageIcon: {
    display: "grid",
    placeItems: "start center",
  },

  messageParagraph: {
    margin: "5px 0 0",
    lineHeight: 1.55,
  },
};

export default ReportIncident;