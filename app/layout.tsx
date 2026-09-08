import './globals.css'

export const metadata = {
  title: 'Mộc Việt | Học viện vận động, cân bằng và thực hành an toàn',
  description:
    'Mộc Việt xây dựng lộ trình học Yoga và Tác động cột sống với nội dung rõ phạm vi, thực hành có hướng dẫn và phản hồi theo chương trình.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
