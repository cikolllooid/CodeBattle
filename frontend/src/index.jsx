import { createRoot } from 'react-dom/client'
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { StrictMode } from 'react'
import "./index.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6200ea" },
    background: { default: "#121212", paper: "#1e1e1e" },
    text: { primary: "#ffffff", secondary: "#b0b0b0" },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </StrictMode>
);
