import Link from 'next/link'

export const metadata = { title: 'Câu hỏi thường gặp | Mộc Việt', description: 'Các câu hỏi về chương trình và phạm vi đào tạo của Mộc Việt.' }

const questions = [
  ['Tôi nên chọn nhánh nào?', 'Yoga phù hợp với mục tiêu xây dựng thói quen và phát triển chuyển động. Tác động cột sống có lộ trình kiến thức, thực hành và đánh giá riêng. Nếu chưa chắc, hãy gửi nhu cầu tư vấn.'],
  ['Giá và lịch học ở đâu?', 'Giá cụ thể và lịch chỉ được hiển thị khi gói hoặc lớp đã được Mộc Việt xác nhận. Khoảng giá kế hoạch không phải là giá thanh toán.'],
  ['Gói có thời hạn bao lâu?', 'Thời hạn nội dung được công bố theo từng gói, tính từ ngày kích hoạt. Quyền hỗ trợ có thể có thời hạn khác.'],
  ['Chứng nhận có phải giấy phép hành nghề không?', 'Không. Chứng nhận của Mộc Việt là chứng nhận hoàn thành chương trình nội bộ và không mặc nhiên là giấy phép hành nghề.'],
  ['Nội dung có thay thế tư vấn y tế không?', 'Không. Nội dung đào tạo không thay thế thăm khám, chẩn đoán hoặc điều trị của cơ sở y tế có thẩm quyền.'],
]

export default function FAQPage() { return <main className="page-shell"><header className="page-header"><div className="container"><nav className="site-nav"><Link className="brand" href="/">Mộc Việt<span>.</span></Link><Link className="button button-small button-dark" href="/dang-ky-tu-van">Nhận tư vấn</Link></nav></div></header><section className="page-hero"><div className="container"><p className="eyebrow">CÂU HỎI THƯỜNG GẶP</p><h1>Những điều cần rõ trước khi học.</h1></div></section><section className="section container"><div className="form-shell">{questions.map(([question, answer]) => <article className="branch-note" key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div></section><footer className="site-footer"><div className="container footer-bottom"><span>© 2026 Mộc Việt</span><span>Phạm vi đào tạo được công bố rõ ràng.</span></div></footer></main> }
