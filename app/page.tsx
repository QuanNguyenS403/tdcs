import Link from 'next/link'
import { academyPackages } from '@/lib/academy-content'

const principles = [
  ['Học có cấu trúc', 'Từ mục tiêu, bài học đến bằng chứng hoàn thành đều được tách rõ.'],
  ['Thực hành có giới hạn', 'Nội dung thực hành chỉ mở trong phạm vi chương trình và điều kiện đã duyệt.'],
  ['Phản hồi có căn cứ', 'Người học biết mình đã xem, đã làm và đã được đánh giá ở trạng thái nào.'],
]

export default function HomePage() {
  return (
    <main>
      <section className="hero-shell">
        <nav className="site-nav" aria-label="Điều hướng chính">
          <Link className="brand" href="/">Mộc Việt<span>.</span></Link>
          <div className="nav-links">
            <Link href="/tac-dong-cot-song">Tác động cột sống</Link>
            <Link href="/yoga">Yoga</Link>
            <Link href="/lich-khai-giang">Lịch khai giảng</Link>
            <Link href="/kien-thuc">Kiến thức</Link>
          </div>
          <Link className="button button-small button-gold" href="/dang-ky-tu-van">Nhận tư vấn</Link>
        </nav>
        <div className="hero-grid container">
          <div>
            <p className="eyebrow">MỘC VIỆT · HỌC VIỆN VẬN ĐỘNG</p>
            <h1>Học đúng kỹ thuật. <em>Thực hành có giám sát.</em></h1>
            <p className="hero-copy">
              Một không gian học tập cho Yoga và Tác động cột sống, nơi chương trình, quyền lợi,
              lịch học và tiêu chí hoàn thành được nói rõ từ đầu.
            </p>
            <div className="button-row">
              <Link className="button button-gold" href="/tac-dong-cot-song">Khám phá lộ trình</Link>
              <Link className="button button-ghost" href="/dang-ky-tu-van">Trao đổi trước khi chọn</Link>
            </div>
          </div>
          <div className="hero-panel" aria-label="Các hướng học của Mộc Việt">
            <div className="hero-panel-label">HAI HƯỚNG HỌC</div>
            <Link href="/tac-dong-cot-song" className="path-card path-card-dark">
              <span className="path-index">01</span>
              <span><strong>Tác động cột sống</strong><small>Kiến thức, thực hành và đánh giá theo lộ trình A1–A3.</small></span>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/yoga" className="path-card path-card-light">
              <span className="path-index">02</span>
              <span><strong>Yoga</strong><small>Từ xây dựng thói quen đến chương trình nâng cao B1–B3.</small></span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading"><p className="eyebrow">CÁCH MỘC VIỆT TỔ CHỨC VIỆC HỌC</p><h2>Rõ ràng trước khi bắt đầu.</h2></div>
        <div className="principle-grid">
          {principles.map(([title, text], index) => <article className="principle" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-heading split-heading"><div><p className="eyebrow">CHƯƠNG TRÌNH ĐANG ĐƯỢC TỔ CHỨC</p><h2>Sáu mã gói, một cách gọi thống nhất.</h2></div><p>Quyền lợi, thời hạn hỗ trợ và điều kiện tham gia được quản lý theo từng gói. Giá chỉ hiển thị khi lớp hoặc đợt đăng ký đã được xác nhận.</p></div>
          <div className="package-grid">
            {academyPackages.map((item) => <Link className="package-card" href={`/khoa-hoc/${item.slug}`} key={item.code}><div className="package-top"><span className="package-code">{item.code}</span><span>{item.branchLabel}</span></div><h3>{item.name}</h3><p>{item.summary}</p><div className="package-meta"><span>{item.accessMonths} tháng nội dung</span><span>{item.supportDays ? `${item.supportDays} ngày hỗ trợ` : 'Theo chương trình'}</span></div></Link>)}
          </div>
        </div>
      </section>

      <section className="section container callout-section">
        <div><p className="eyebrow">CHƯA BIẾT BẮT ĐẦU TỪ ĐÂU?</p><h2>Chọn chương trình theo mục tiêu, không theo một nút mua chung.</h2><p>Gửi nhu cầu học tập của bạn. Mộc Việt sẽ phản hồi về chương trình, điều kiện đầu vào và bước tiếp theo phù hợp.</p></div>
        <Link className="button button-dark" href="/dang-ky-tu-van">Gửi nhu cầu học</Link>
      </section>

      <footer className="site-footer"><div className="container footer-grid"><div><Link className="brand brand-light" href="/">Mộc Việt<span>.</span></Link><p>Học viện vận động, cân bằng và thực hành an toàn.</p></div><div><strong>Khám phá</strong><Link href="/tac-dong-cot-song">Tác động cột sống</Link><Link href="/yoga">Yoga</Link><Link href="/lich-khai-giang">Lịch khai giảng</Link></div><div><strong>Thông tin</strong><Link href="/ve-moc-viet">Về Mộc Việt</Link><Link href="/cau-hoi-thuong-gap">Câu hỏi thường gặp</Link><Link href="/lien-he">Liên hệ</Link></div></div><div className="container footer-bottom"><span>© 2026 Mộc Việt</span><span>Chương trình đào tạo không thay thế thăm khám, chẩn đoán hoặc điều trị y tế.</span></div></footer>
    </main>
  )
}