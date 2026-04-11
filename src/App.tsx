import Home from './pages/home'
import Feed from './pages/feed'
import TierList from './pages/tierlist'

export default function App() {
  const path = window.location.pathname
  if (path === '/feed') return <Feed />
  if (path === '/tierlist') return <TierList />
  return <Home />
}
