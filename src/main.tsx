import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DashboardApiProvider } from './app/DashboardApiProvider.tsx'
import { createDashboardApi } from './app/createDashboardApi.ts'
import { readSession } from './features/auth/session.ts'

// A reload keeps the session: the adapter needs the stored token immediately.
const api = createDashboardApi({ token: readSession()?.token })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>
  </StrictMode>,
)
