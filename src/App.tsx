import Radar from './pages/radar'
import Target from './pages/target'
import Grid from './pages/grid'
import Home from './pages/home'
import Feed from './pages/feed'
import TierList from './pages/tierlist'
import Admin from './pages/admin'

export default function App() {
  const path = window.location.pathname
  // Radar is the front door: the scanner can only judge a project you already know the name of,
  // so it cannot be the entry point for "never miss alpha". /scan keeps it one click away, and
  // legacy /?q= deep links from the feed still land on the scanner.
  if (path.startsWith('/target/')) return <Target />
  if (path === '/grid') return <Grid />
  if (path === '/scan') return <Home />
  if (path === '/feed') return <Feed />
  if (path === '/tierlist') return <TierList />
  if (path === '/admin') return <Admin />
  if (path === '/' && new URLSearchParams(window.location.search).get('q')) return <Home />
  return <Radar />
}
