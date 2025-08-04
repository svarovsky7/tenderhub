import { Routes, Route } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'

const App = (): JSX.Element => (
  <Routes>
    <Route path="/" element={<RegisterPage />} />
  </Routes>
)

export default App

