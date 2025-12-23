import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'
import SpotifySearchInput from '../components/shared/SpotifySearchInput'
import { rest } from 'msw'
import { initialize, mswDecorator } from 'msw-storybook-addon'

initialize()

export default {
  title: 'Components/SpotifySearchInput',
  component: SpotifySearchInput,
  decorators: [mswDecorator],
} as ComponentMeta<typeof SpotifySearchInput>

const Template: ComponentStory<typeof SpotifySearchInput> = () => (
  <SpotifySearchInput />
)

export const Default = Template.bind({})
Default.parameters = {
  msw: {
    handlers: [
      rest.get('/api/spotify/search', (req, res, ctx) => {
        return res(ctx.json({ tracks: { items: [] } }))
      }),
    ],
  },
}

export const WithResults = Template.bind({})
WithResults.parameters = {
  msw: {
    handlers: [
      rest.get('/api/spotify/search', (req, res, ctx) => {
        return res(
          ctx.json({
            tracks: {
              items: [
                {
                  id: '1',
                  name: 'Test Track 1',
                  artists: [{ name: 'Test Artist 1' }],
                },
                {
                  id: '2',
                  name: 'Test Track 2',
                  artists: [{ name: 'Test Artist 2' }],
                },
              ],
            },
          })
        )
      }),
    ],
  },
}

export const Loading = Template.bind({})
Loading.parameters = {
  msw: {
    handlers: [
      rest.get('/api/spotify/search', (req, res, ctx) => {
        return res(ctx.delay(1000 * 60 * 60 * 60), ctx.json({}))
      }),
    ],
  },
}

export const NoResults = Template.bind({})
NoResults.parameters = {
  msw: {
    handlers: [
      rest.get('/api/spotify/search', (req, res, ctx) => {
        return res(ctx.json({ tracks: { items: [] } }))
      }),
    ],
  },
}

export const Error = Template.bind({})
Error.parameters = {
  msw: {
    handlers: [
      rest.get('/api/spotify/search', (req, res, ctx) => {
        return res(ctx.status(500))
      }),
    ],
  },
}
