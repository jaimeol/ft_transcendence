// frontend/src/google.ts
export {};

type GoogleCredential = { credential: string };

declare global {
  interface Window {
    handleGoogle: (res: GoogleCredential) => void;
    google?: any;
  }
}

// ---------- UI refs ----------
const btn = document.getElementById("google-btn") as HTMLButtonElement | null;
const label = document.getElementById("google-label") as HTMLSpanElement | null;
const gIcon = document.getElementById("google-g-icon") as SVGElement | null;
const spinner = document.getElementById("google-spinner") as SVGElement | null;

function setLoading(loading: boolean) {
  if (!btn || !label || !gIcon || !spinner) return;
  btn.disabled = loading;
  btn.setAttribute("aria-busy", String(loading));
  if (loading) {
    label.textContent = "Conectando…";
    gIcon.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    label.textContent = "Continuar con Google";
    gIcon.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

// brillo radial al puntero
btn?.addEventListener("mousemove", (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  (e.currentTarget as HTMLElement).style.setProperty("--x", `${x}px`);
  (e.currentTarget as HTMLElement).style.setProperty("--y", `${y}px`);
});

// ---------- GIS init ----------
function getClientId(): string {
  const meta = document.querySelector('meta[name="google-client-id"]') as HTMLMetaElement | null;
  return meta?.content || "";
}

function waitForGIS(timeoutMs = 6000): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(t);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        reject(new Error("Google Identity Services no cargó"));
      }
    }, 50);
  });
}

let initialized = false;
let isLoading = false; // Prevenir múltiples clics
let googleButtonRendered = false; // Saber si ya renderizamos el botón

async function initGoogle() {
  if (initialized) return;
  const clientId = getClientId();
  if (!clientId) {
    console.warn("Falta <meta name='google-client-id' ...>");
    return;
  }
  await waitForGIS();
  
  // Inicializar una sola vez
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: window.handleGoogle,
    auto_select: false,
    itp_support: true,
    use_fedcm_for_prompt: true,
  });
  
  initialized = true;
}

// ---------- Callback principal: envía id_token al backend ----------
window.handleGoogle = async ({ credential }: GoogleCredential) => {
  try {
    const r = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id_token: credential }),
    });
    if (!r.ok) {
      const msg = await r.text();
      setLoading(false);
      isLoading = false;
      alert("Error al iniciar sesión con Google: " + msg);
      return;
    }
    // éxito → dejamos el loading hasta navegar
    location.href = "/home.html";
  } catch {
    setLoading(false);
    isLoading = false;
    alert("Fallo de red con Google Sign-In");
  }
};

// ---------- Click del botón: disparar One Tap o selector de cuentas ----------
btn?.addEventListener("click", async () => {
  // Prevenir múltiples clics
  if (isLoading) {
    console.log("Google Sign-In ya está en proceso...");
    return;
  }
  
  setLoading(true);
  isLoading = true;
  
  // Timeout de seguridad para evitar que se quede cargando forever
  const timeout = setTimeout(() => {
    setLoading(false);
    isLoading = false;
    console.warn("Timeout en Google Sign-In");
  }, 10000); // Reducido a 10 segundos

  try {
    await initGoogle();
    
    // Si ya renderizamos el botón de Google anteriormente, solo usar prompt
    if (googleButtonRendered) {
      console.log("Usando One Tap prompt...");
      // Usar prompt() que mostrará el selector de cuentas
      window.google.accounts.id.prompt((notification: any) => {
        clearTimeout(timeout);
        isLoading = false;
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          setLoading(false);
          console.log("One Tap no se pudo mostrar, renderizando botón de Google...");
          
          // Si One Tap no funciona, renderizar el botón de Google como fallback
          renderGoogleButton();
        }
      });
    } else {
      // Primera vez: intentar renderizar el botón de Google directamente
      console.log("Renderizando botón de Google...");
      renderGoogleButton();
    }
    
  } catch (e) {
    clearTimeout(timeout);
    setLoading(false);
    isLoading = false;
    console.error("Error al inicializar Google Sign-In:", e);
    alert("No se pudo iniciar Google Sign-In. Reintenta.");
  }
});

// Función para renderizar el botón de Google como fallback
function renderGoogleButton() {
  if (!btn || googleButtonRendered) return;
  
  try {
    // Crear un div temporal para el botón de Google
    const googleBtnContainer = document.createElement('div');
    googleBtnContainer.style.position = 'absolute';
    googleBtnContainer.style.top = '0';
    googleBtnContainer.style.left = '0';
    googleBtnContainer.style.width = '100%';
    googleBtnContainer.style.height = '100%';
    googleBtnContainer.style.opacity = '0';
    googleBtnContainer.style.pointerEvents = 'auto';
    btn.style.position = 'relative';
    btn.appendChild(googleBtnContainer);
    
    window.google.accounts.id.renderButton(googleBtnContainer, {
      theme: "outline",
      size: "large",
      width: btn.offsetWidth,
      text: "continue_with",
      shape: "rectangular",
    });
    
    googleButtonRendered = true;
    
    // Simular click en el botón de Google
    setTimeout(() => {
      const googleBtn = googleBtnContainer.querySelector('div[role="button"]') as HTMLElement;
      if (googleBtn) {
        googleBtn.click();
      }
    }, 100);
    
  } catch (e) {
    console.error("Error renderizando botón de Google:", e);
    setLoading(false);
    isLoading = false;
  }
}
