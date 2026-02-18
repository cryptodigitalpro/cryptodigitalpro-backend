<script>

const API =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://cryptodigitalpro-api.onrender.com";

const $ = id => document.getElementById(id);

/* TAB SWITCH */
$("tabSignIn").onclick = () => {
  $("tabSignIn").classList.add("active");
  $("tabSignUp").classList.remove("active");
  $("formSignIn").classList.add("active");
  $("formSignUp").classList.remove("active");
};

$("tabSignUp").onclick = () => {
  $("tabSignUp").classList.add("active");
  $("tabSignIn").classList.remove("active");
  $("formSignUp").classList.add("active");
  $("formSignIn").classList.remove("active");
};

/* PASSWORD TOGGLE */
function togglePassword(id){
  const input = document.getElementById(id);
  const toggle = input.nextElementSibling;
  if(input.type === "password"){
    input.type = "text";
    toggle.textContent = "Hide";
  } else {
    input.type = "password";
    toggle.textContent = "Show";
  }
}

/* LOGIN */
$("btnSignIn").onclick = async () => {
  const email = $("signinEmail").value.trim();
  const password = $("signinPass").value.trim();
  if(!email || !password) return alert("Missing credentials");

  try {
    const res = await fetch(API + "/api/auth/login", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if(!res.ok) {
      console.error("Login error:", data);
      return alert(data.message || data.error || "Login failed");
    }

    localStorage.setItem("token", data.token);

    const redirect = localStorage.getItem("redirectAfterLogin");

    if (redirect) {
      localStorage.removeItem("redirectAfterLogin");
      location.href = redirect;
    } else {
      location.href = "dashboard.html";
    }

  } catch(err){
    console.error("Server error:", err);
    alert("Server not reachable");
  }
};

/* SIGNUP */
$("btnSignUp").onclick = async () => {
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const pass = $("signupPass").value.trim();
  const confirm = $("signupConfirm").value.trim();

  if(!name || !email || !pass) return alert("All fields required");
  if(pass !== confirm) return alert("Passwords do not match");

  try {
    const res = await fetch(API + "/api/auth/register", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ full_name:name, email, password:pass })
    });

    const data = await res.json();

    if(!res.ok) {
      console.error("Signup error:", data);
      return alert(data.message || data.error || "Signup failed");
    }

    localStorage.setItem("token", data.token);

    const redirect = localStorage.getItem("redirectAfterLogin");

    if (redirect) {
      localStorage.removeItem("redirectAfterLogin");
      location.href = redirect;
    } else {
      location.href = "dashboard.html";
    }

  } catch(err){
    console.error("Server error:", err);
    alert("Server not reachable");
  }
};

/* GOOGLE LOGIN */
async function handleGoogleLogin(response) {
  try {
    const res = await fetch(API + "/api/auth/google", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ token: response.credential })
    });

    const data = await res.json();

    if(!res.ok) {
      console.error("Google login error:", data);
      return alert(data.message || data.error || "Google login failed");
    }

    localStorage.setItem("token", data.token);

    location.href = "dashboard.html";

  } catch(err){
    console.error("Server error:", err);
    alert("Server unreachable");
  }
}

</script>
