'use client'

import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useState } from 'react'

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Phone Controls', href: '/client/control' },
  { label: 'Stream HR', href: '/client/connect' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref>
            HRM
          </Link>
        </Typography>

        {/* Mobile Navigation */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMobileMenuToggle}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {navLinks.map((link) => (
            <Button
              key={link.label}
              color="inherit"
              component={Link}
              href={link.href}
            >
              {link.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={handleMobileMenuToggle}
          onKeyDown={handleMobileMenuToggle}
        >
          <List>
            {navLinks.map((link) => (
              <ListItem key={link.label} disablePadding>
                <ListItemButton component={Link} href={link.href}>
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  )
}
