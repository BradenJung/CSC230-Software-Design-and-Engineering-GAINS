import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { apiUrl } from "../lib/api";

export default function HealthStatus() {
  const [status, setStatus] = useState({ state: "loading" });

  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        const res = await fetch(apiUrl("/api/health/db"));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unavailable");
        if (isMounted) setStatus({ state: "ok" });
      } catch (err) {
        if (isMounted) setStatus({ state: "down", message: err.message });
      }
    }
    check();
    const id = setInterval(check, 30000); // refresh every 30s
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  const map = {
    loading: { label: "Checking API", className: styles.healthChipLoading },
    ok: { label: "API online", className: styles.healthChipOk },
    down: { label: "API issue", className: styles.healthChipDown },
  };

  const current = map[status.state] || map.loading;

  return (
    <span className={`${styles.healthChip} ${current.className}`} title={status.message || current.label}>
      {current.label}
    </span>
  );
}
