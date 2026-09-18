// Loads Razorpay checkout script once and returns a promise that resolves to window.Razorpay.
let scriptPromise = null;

export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}
