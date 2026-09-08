import Link from 'next/link'
import { notFound } from 'next/navigation'

const policies: Record<string, { title: string; body: string[] }> = {
  'pham-vi-dao-tao': { title: 'Phạm vi đào tạo', body: ['Mộc Việt cung cấp hoạt động đào tạo theo chương trình, gói và lớp được công bố.', 'Chứng nhận của Mộc Việt không mặc nhiên là giấy phép hành nghề.', 'Nội dung đào tạo không thay thế thăm khám, chẩn đoán hoặc điều trị của cơ sở y tế có thẩm quyền.'] },
  'bao-mat': { title: 'Chính sách bảo mật', body: ['Mộc Việt chỉ thu thập thông tin cần thiết cho tài khoản, tư vấn, đăng ký và vận hành chương trình.', 'Thông tin tư vấn chỉ được dùng trong phạm vi mục đích đã thông báo và đồng ý.', 'Repository hiện chưa cấu hình thời hạn lưu trữ production; chính sách chi tiết cần được hoàn thiện trước khi mở bán.'] },
  'thanh-toan': { title: 'Chính sách thanh toán', body: ['Đơn hàng phải lưu đúng gói, lớp, giá và phiên bản quyền lợi tại thời điểm mua.', 'Không thanh toán khi lịch, giá hoặc điều kiện chương trình chưa được xác nhận.', 'Phương thức thanh toán chỉ được công bố khi tích hợp và đối soát được trong môi trường thật.'] },
  'hoan-phi-bao-luu': { title: 'Hoàn phí và bảo lưu', body: ['Điều kiện hoàn phí và bảo lưu phải khớp với quyền lợi, thời hạn và dữ liệu sử dụng thực tế.', 'Mộc Việt chưa bật quy trình hoàn phí tự động trong repository hiện tại.', 'Không coi thông báo thành công trên giao diện là bằng chứng đã hoàn tất xử lý.'] },
  'hoc-lieu-va-ghi-hinh': { title: 'Học liệu và ghi hình', body: ['Học liệu được truy cập theo gói, thời hạn và điều kiện chương trình.', 'Nội dung thực hành cần được duyệt và phân quyền ở máy chủ, không chỉ ẩn nút trên giao diện.', 'Việc ghi hình, lưu trữ và sử dụng bài nộp cần có thông báo và đồng ý phù hợp.'] },
}

export function generateStaticParams() { return Object.keys(policies).map((slug) => ({ slug })) }
export function generateMetadata({ params }: { params: { slug: string } }) { return { title: `${policies[params.slug]?.title || 'Chính sách'} | Mộc Việt` } }

export default function PolicyPage({ params }: { params: { slug: string } }) { const policy = policies[params.slug]; if (!policy) notFound(); return <main className="page-shell"><header className="page-header"><div className="container"><nav className="site-nav"><Link className="brand" href="/">Mộc Việt<span>.</span></Link><Link className="button button-small button-dark" href="/">Về trang chủ</Link></nav></div></header><section className="page-hero"><div className="container"><p className="eyebrow">CHÍNH SÁCH</p><h1>{policy.title}</h1></div></section><section className="section container"><div className="form-shell">{policy.body.map((paragraph) => <p className="branch-note" key={paragraph}>{paragraph}</p>)}</div></section><footer className="site-footer"><div className="container footer-bottom"><span>© 2026 Mộc Việt</span><Link href="/lien-he">Liên hệ</Link></div></footer></main> }
