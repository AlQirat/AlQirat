/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.js"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C99A4B",
          light: "#E8BD6D",
          dark: "#A87A32",
        },
        ink: {
          DEFAULT: "#14281A",
          soft: "#1B3424",
          card: "#264030",
        },
        forest: {
          DEFAULT: "#3A4729",
          dark: "#2B361E",
        },
        sage: {
          DEFAULT: "#DCE5D0",
          light: "#EAF0E2",
        },
        cream: {
          DEFAULT: "#F6F4EC",
          dark: "#ECE8DA",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        script: ["var(--font-script)", "cursive"],
      },
      maxWidth: {
        site: "1400px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(36px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        kenburns: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.07)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
        glow: {
          "0%,100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-160px) scale(0.3)", opacity: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%,100%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "50%": { transform: "scale(1) rotate(90deg)", opacity: "1" },
        },
        sweepRay: {
          "0%,100%": { opacity: "0.25", transform: "rotate(-3deg)" },
          "50%": { opacity: "0.6", transform: "rotate(3deg)" },
        },
        bob: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.9s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fadeIn 1.2s ease both",
        float: "float 6s ease-in-out infinite",
        kenburns: "kenburns 22s ease-in-out infinite alternate",
        shimmer: "shimmer 4s linear infinite",
        "spin-slow": "spinSlow 30s linear infinite",
        glow: "glow 4s ease-in-out infinite",
        rise: "rise 7s ease-in infinite",
        bob: "bob 1.8s ease-in-out infinite",
        twinkle: "twinkle 3.6s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        ray: "sweepRay 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
