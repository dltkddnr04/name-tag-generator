import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '이름표 생성기',
  description: '참석자 이름표를 쉽게 만들고 출력하세요',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
