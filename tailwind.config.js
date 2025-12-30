/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          light: "#f4f5f7",
          dark: "#171717",
        },
        surface: {
          light: "#ffffff",
          dark: "#1f1f1f",
        },
        input: {
          light: "#f9fafb",
          dark: "#262626",
        },
        border: {
          light: "#e5e7eb",
          dark: "#2e2e2e",
        },
        text: {
          light: "#111827",
          dark: "#e5e7eb",
          mutedLight: "#6b7280",
          mutedDark: "#a1a1aa",
        },
        primary: {
          DEFAULT: "#22c55e", // verde elegante
        },
      },
    }

  },
  plugins: []
}
