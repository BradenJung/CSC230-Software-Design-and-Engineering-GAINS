async function handleSignup(e) {
  e.preventDefault();

  const fd = new FormData(e.currentTarget);
  const name = String(fd.get("name") || "");
  const email = String(fd.get("email") || "");
  const password = String(fd.get("password") || "");
  const confirmPassword = String(fd.get("confirmPassword") || "");

  if (password !== confirmPassword) {
    alert("Passwords must match.");
    return;
  }

  try {
    const res = await fetch("http://localhost:4000/server/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    alert(data.message || "Signup successful!");
  } catch (err) {
    alert(err.message);
  }
}
