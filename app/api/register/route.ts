import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { promises as fs } from 'fs'
import path from 'path'

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

type User = z.infer<typeof userSchema>

const usersFilePath = path.join(process.cwd(), 'logs', 'users.json')

async function getUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = userSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { username, password } = validation.data
    const users = await getUsers()

    const userExists = users.some((user) => user.username === username)
    if (userExists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = { username, password: hashedPassword }
    const updatedUsers = [...users, newUser]

    await fs.mkdir(path.dirname(usersFilePath), { recursive: true })
    await fs.writeFile(usersFilePath, JSON.stringify(updatedUsers, null, 2))

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API /register] Internal Server Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
