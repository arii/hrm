// app/api/graphql/route.ts
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import {
  tabataServiceInstance,
  spotifyServiceInstance,
  clientData,
} from '@/utils/socketManager'

const typeDefs = `
  type Query {
    currentWorkout: Workout
    spotifyStatus: SpotifyStatus
    heartRateData: [HRData]
  }
  type Workout {
    isRunning: Boolean
    currentPhase: String
    timeRemaining: Int
    timeElapsed: Int
    mode: String
    workDuration: Int
    restDuration: Int
  }
  type SpotifyStatus {
    trackName: String
    artist: String
    isPlaying: Boolean
  }
  type HRData {
    clientId: String
    value: Int
    maxHr: Int
    name: String
    age: Int
  }
`

const resolvers = {
  Query: {
    currentWorkout: () => tabataServiceInstance.getState(),
    spotifyStatus: () => spotifyServiceInstance.getState(),
    heartRateData: () => Array.from(clientData.values()),
  },
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

const yoga = createYoga({
  schema,
  // Needed to get the correct path in production
  graphqlEndpoint: '/api/graphql',
})

export { yoga as GET, yoga as POST }
