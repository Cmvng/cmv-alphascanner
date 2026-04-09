import Home from './pages/home'
import Feed from './pages/feed'

export default function App() {
  const path = window.location.pathname
  if (path === '/feed') return <Feed />
  return <Home />
}
