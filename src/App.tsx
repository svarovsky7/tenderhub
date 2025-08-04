import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import AppLayout from './components/AppLayout'

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </div>
  )
}

export default App
