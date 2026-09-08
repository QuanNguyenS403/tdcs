import Link from 'next/link'
import { notFound } from 'next/navigation'

const policies: Record<string, { title: string; body: string[] }> = {
  'pham-vi-dao-tao': {
    title: 'Phạm vi đào tạo',
    body: [
      'Mộc Việt cung cấp hoạt động đào tạo theo chương trình, gói và lớp được công bố chính thức.',
      'Chứng nhận hoàn thành khóa học của Mộc Việt là sự công nhận về năng lực thực hành chuyên môn trong phạm vi chương trình, không thay thế cho các văn bằng hay giấy phép hành nghề y tế theo quy định pháp luật.',
      'Nội dung đào tạo và hướng dẫn thực hành nhằm mục đích chăm sóc sức khỏe chủ động, không thay thế cho việc thăm khám, chẩn đoán hay điều trị y khoa của các cơ sở y tế có thẩm quyền.'
    ]
  },
  'bao-mat': {
    title: 'Chính sách bảo mật',
    body: [
      'Mộc Việt cam kết bảo vệ dữ liệu cá nhân của người học. Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ cho việc định danh tài khoản, tư vấn lộ trình và tổ chức lớp học.',
      'Thông tin tư vấn và liên hệ chỉ được sử dụng đúng mục đích hỗ trợ học viên, tuyệt đối không chia sẻ cho bên thứ ba khi chưa có sự đồng ý rõ ràng.',
      'Dữ liệu học tập và thông tin cá nhân được bảo vệ trên hệ thống máy chủ bảo mật và có thể được yêu cầu cập nhật hoặc hủy lưu trữ bất cứ lúc nào qua kênh hỗ trợ chính thức.'
    ]
  },
  'thanh-toan': {
    title: 'Chính sách thanh toán',
    body: [
      'Đơn hàng thanh toán khóa học lưu trữ chính xác thông tin gói, học phí và các quyền lợi đi kèm tại thời điểm học viên xác nhận đăng ký.',
      'Mộc Việt áp dụng hình thức chuyển khoản ngân hàng qua mã thanh toán VietQR chính thức với nội dung chuyển khoản riêng biệt cho từng đơn hàng.',
      'Quyền học tập sẽ được hệ thống tự động kích hoạt ngay khi ngân hàng đối soát thành công giao dịch của học viên.'
    ]
  },
  'hoan-phi-bao-luu': {
    title: 'Hoàn phí và bảo lưu',
    body: [
      'Chính sách hoàn học phí và bảo lưu được áp dụng linh hoạt dựa trên tiến độ học tập thực tế và quy định chi tiết của từng khóa học.',
      'Học viên có nguyện vọng bảo lưu khóa học hoặc giải quyết các vấn đề tài chính vui lòng liên hệ ban quản trị để được hướng dẫn quy trình xác nhận hồ sơ.',
      'Thời gian tiếp nhận và xử lý các yêu cầu bảo lưu, hoàn phí là từ 3 đến 5 ngày làm việc kể từ thời điểm gửi thông tin đầy đủ.'
    ]
  },
  'hoc-lieu-va-ghi-hinh': {
    title: 'Học liệu và ghi hình',
    body: [
      'Học viên được toàn quyền truy cập hệ thống bài giảng video và tài liệu học tập trong suốt thời hạn hiệu lực của gói học đã đăng ký.',
      'Nội dung học liệu và bài giảng thuộc bản quyền trí tuệ của Mộc Việt, học viên sử dụng cho mục đích học tập cá nhân và không sao chép, phát tán trái phép.',
      'Đối với các buổi thực hành trực tuyến hoặc lớp học tương tác, việc ghi hình tư liệu học tập sẽ được thông báo rõ ràng đến toàn thể học viên tham gia.'
    ]
  },
}

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: `${policies[params.slug]?.title || 'Chính sách'} | Mộc Việt` }
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = policies[params.slug]
  if (!policy) notFound()

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="container">
          <nav className="site-nav">
            <Link className="brand" href="/">
              Mộc Việt<span>.</span>
            </Link>
            <div className="nav-links">
              <Link href="/khoa-hoc">Khóa học</Link>
              <Link href="/ve-moc-viet">Về Mộc Việt</Link>
              <Link href="/dang-ky-tu-van">Tư vấn</Link>
            </div>
            <Link className="button button-small button-dark" href="/">
              Về trang chủ
            </Link>
          </nav>
        </div>
      </header>

      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">CHÍNH SÁCH</p>
          <h1>{policy.title}</h1>
        </div>
      </section>

      <section className="section container">
        <div className="form-shell">
          {policy.body.map((paragraph, idx) => (
            <p className="branch-note" key={idx} style={{ marginBottom: '1rem', lineHeight: '1.75' }}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-bottom">
          <span>© 2026 Mộc Việt — Viện Đào tạo Tác Động Cột Sống & Yoga</span>
          <Link href="/lien-he">Liên hệ hỗ trợ</Link>
        </div>
      </footer>
    </main>
  )
}
