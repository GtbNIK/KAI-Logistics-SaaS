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
                    dark: '#003366',  // Azul oscuro
                    light: '#4A90E2', // Azul claro
                },
                secondary: '#FFA500', // Naranja
            },
        },
    },
    plugins: [],
}
