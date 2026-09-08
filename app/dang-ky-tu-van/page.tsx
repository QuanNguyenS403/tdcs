import Link from 'next/link'
import ConsultationForm from './ConsultationForm'

export const metadata = { title: 'Đăng ký tư vấn | Mộc Việt', description: 'Gửi nhu cầu học tập đến Mộc Việt.' }

export default function ConsultationPage() {
  return <main className="page-shell"><header className="page-header"><div className="container"><nav className="site-nav"><Link className="brand" href="/">Mộc Việt<span>.</span></Link><Link className="button button-small button-dark" href="/">Về trang chủ</Link></nav></div></header><section className="page-hero"><div className="container"><p className="eyebrow">TƯ VẤN LỘ TRÌNH</p><h1>Hãy bắt đầu bằng mục tiêu thật.</h1><p>Thông tin này tạo một hồ sơ tư vấn thật để đội ngũ Mộc Việt biết bạn đang cần gì. Đây chưa phải đơn hàng và không thay thế bước xét phù hợp khi chương trình yêu cầu.</p></div></section><section className="section container"><ConsultationForm /></section><footer className="site-footer"><div className="container footer-bottom"><span>© 2026 Mộc Việt</span><span>Thông tin chỉ được dùng trong phạm vi tư vấn đã đồng ý.</span></div></footer></main>
}