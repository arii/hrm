/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import AppSettings from '../../../../../app/client/connect/AppSettings'

describe('AppSettings', () => {
  it('renders the component', () => {
    render(
      <AppSettings
        userName=""
        setUserName={() => {}}
        userAge=""
        setUserAge={() => {}}
        userHeight={0}
        setUserHeight={() => {}}
        userWeight=""
        setUserWeight={() => {}}
        gender="MALE"
        setGender={() => {}}
        unit="IMPERIAL"
        setUnit={() => {}}
        feet=""
        setFeet={() => {}}
        inches=""
        setInches={() => {}}
        ageError={null}
        weightError={null}
        heightError={null}
        handleImperialHeightChange={() => {}}
        handleImperialHeightBlur={() => {}}
        onHeightBlur={() => {}}
      />
    )
    expect(screen.getByText('Imperial (lbs, ft, in)')).toBeInTheDocument()
  })
})
