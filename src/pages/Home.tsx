import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../styles/home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-root">
      <motion.header
        className="home-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="home-title">Tournament Tracker</h1>
        <p className="home-sub">Real-time leaderboards for your events</p>
      </motion.header>

      <motion.div
        className="home-features"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="feature-card">
          <span className="feature-icon">📊</span>
          <h3>Live Leaderboards</h3>
          <p>Scores update in real-time as games are played</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏆</span>
          <h3>Multiple Events</h3>
          <p>Track tournaments, galas, and competitions across editions</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📱</span>
          <h3>Mobile-First</h3>
          <p>Built for data collectors on the field with phones</p>
        </div>
      </motion.div>

      <motion.div
        className="home-cta"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <button onClick={() => navigate('/login')} className="home-login-btn">
          Log In
        </button>
      </motion.div>
    </div>
  )
}
