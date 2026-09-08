import Link from 'next/link'
import { notFound } from 'next/navigation'
import { academyPackages, getPackageBySlug } from '@/lib/academy-content'

export function generateStaticParams() { return academyPackages.map((item) => ({ slug: item.slug })) }

export function generateMetadata({ params }: { params: { slug: string } }) {
  const item = getPackageBySlug(params.slug)
  return { title: item ? `${item.name} | Mộc Việt` : 'Chương trình | Mộc Việt', description: item?.summary }
}

export default function CoursePage({ params }: { params: { slug: string } }) {
  const item = getPackageBySlug(params.slug)
  if (!item) notFound()
  return <main className="page-shell"><header className="page-header"><div className="container"><nav className="site-nav"><Link className="brand" href="/">Mộc Việt<span>.</span></Link><div className="nav-links"><Link href="/tac-dong-cot-song">Tác động cột sống</Link><Link href="/yoga">Yoga</Link><Link href="/lich-khai-giang">Lịch khai giảng</Link></div><Link className="button button-small button-dark" href="/dang-ky-tu-van">Nhận tư vấn</Link></nav></div></header><section className="page-hero"><div className="container"><p className="eyebrow">{item.code} · {item.branchLabel}</p><h1>{item.name}</h1><p>{item.summary}</p></div></section><section className="section container"><div className="course-detail-grid"><div><p className="eyebrow">BẠN SẼ BIẾT RÕ</p><h2>Quyền lợi và điều kiện được tách riêng.</h2><p>Trang này chỉ mô tả khung chương trình. Giá, lịch và lớp cụ thể chỉ xuất hiện sau khi Mộc Việt xác nhận đợt mở đăng ký.</p><div className="status-note">Hiện chưa có lớp khai giảng được công bố cho gói này. Bạn có thể gửi nhu cầu để nhận thông tin khi có lịch thật.</div></div><aside className="detail-panel"><h3>Thông tin gói</h3><ul><li>Truy cập nội dung: {item.accessMonths} tháng kể từ ngày kích hoạt</li><li>Thời hạn hỗ trợ: {item.supportDays ? `${item.supportDays} ngày` : 'Theo đề cương lớp'}</li><li>{item.requiresScreening ? 'Cần gửi hồ sơ xét phù hợp trước khi đăng ký' : 'Không yêu cầu hồ sơ xét phù hợp theo danh mục hiện tại'}</li><li>{item.includesCertification ? 'Có quyền dự đánh giá theo tiêu chí công khai, không tự động cấp chứng nhận' : 'Không bao gồm chứng nhận'}</li></ul></aside></div></section><section className="section section-tint"><div className="container"><div className="section-heading"><p className="eyebrow">CHƯA CÓ DỮ LIỆU LỊCH THẬT</p><h2>Không dùng dữ liệu mẫu để tạo cảm giác đang mở bán.</h2><p>Lịch, địa điểm, người hướng dẫn, số chỗ và học phí sẽ được bổ sung khi có thông tin vận hành được xác nhận.</p></div><Link className="button button-dark" href="/dang-ky-tu-van">Đăng ký nhận thông tin</Link></div></section><footer className="site-footer"><div className="container footer-bottom"><span>© 2026 Mộc Việt</span><span>Chương trình là hoạt động đào tạo trong phạm vi đã công bố.</span></div></footer></main>
}
