import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Feed from './pages/feed'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
      </Routes>
    </BrowserRouter>
  )
}
