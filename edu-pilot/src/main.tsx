import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "./context/AuthContext";
import { ApiProvider } from "./context/ApiProvider.tsx";           // ⬅️ neu
import { Provider as ReduxProvider } from "react-redux";
import store from "./context/store";            


createRoot(document.getElementById('root')!).render(
 <StrictMode>
    <AuthProvider>
      <ApiProvider>            {/* ⬅️ hängt auf useDjangoToken aus AuthProvider auf */}
        <ReduxProvider store={store}>
          <App />
        </ReduxProvider>
      </ApiProvider>
    </AuthProvider>
  </StrictMode>
)
