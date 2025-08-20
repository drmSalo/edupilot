import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from "react-redux";
import store from './context/store.ts';
import { AuthProvider } from './context/AuthContext.tsx'; // 🔥 hinzufügen

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider> 
        <App />
      </AuthProvider>
    </Provider>
  </StrictMode>,
)
