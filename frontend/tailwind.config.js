/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    dark: '#1F3042',  // Azul oscuro
                    light: '#4A90E2', // Azul claro
                },
                secondary: '#F58927', // Naranja
            },
        },
    },
    plugins: [],
}
