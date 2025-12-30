// app/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HrmDataLogEntry } from '../../services/HrmDataLogger'

const AnalyticsPage = () => {
  const [sessionData, setSessionData] = useState<HrmDataLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics/sessions')
        const data = await response.json()
        setSessionData(data.sessions)
      } catch (error) {
        console.error('Error fetching session data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Heart Rate Analytics</h1>
      {loading ? (
        <p>Loading session data...</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={sessionData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Heart Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default AnalyticsPage
