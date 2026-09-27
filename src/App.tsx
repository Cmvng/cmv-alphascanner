import Home from './pages/home'
import Feed from './pages/feed'
import TierList from './pages/tierlist'
import Admin from './pages/admin'
import Football from './pages/football'

export default function App() {
  const path = window.location.pathname
  if (path === '/feed') return <Feed />
  if (path === '/tierlist') return <TierList />
  if (path === '/admin') return <Admin />
  if (path === '/football') return <Football />
  return <Home />
}
