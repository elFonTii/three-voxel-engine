import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voxel World Engine',
  description: 'A 3D voxel world renderer with procedural terrain generation and chunk streaming',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  )
}
