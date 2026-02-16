function setSession(user){
  sessionStorage.setItem("tj_user", JSON.stringify(user));
}

document.addEventListener("click", (e) => {
  if (e.target?.id === "btnLogin") {
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value.trim();
    if(!email || !pass) return alert("Completa correo y contraseña");

    // Demo: login directo
    setSession({ name: "Martin", email });
    window.location.href = "/app";
  }

  if (e.target?.id === "btnRegister") {
    const name = document.getElementById("name").value.trim();
    const last = document.getElementById("last").value.trim();
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value.trim();
    const conf  = document.getElementById("confirm").value.trim();

    if(!name || !last || !email || !pass) return alert("Completa todos los campos");
    if(pass !== conf) return alert("Las contraseñas no coinciden");

    setSession({ name, email });
    window.location.href = "/app";
  }
});