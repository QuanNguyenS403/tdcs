'use client'

import { FormEvent, useState } from 'react'

export default function ConsultationForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    const response = await fetch('/api/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, consent: form.get('consent') === 'on' }),
    })

    if (!response.ok) {
      setState('error')
      setMessage('Chưa thể lưu hồ sơ. Vui lòng thử lại sau.')
      return
    }

    const result = await response.json()
    setState('success')
    setMessage(`Đã ghi nhận hồ sơ ${result.data.leadId}. Mộc Việt sẽ phản hồi theo kênh bạn để lại.`)
    event.currentTarget.reset()
  }

  return <form className="form-shell" onSubmit={submit}><div className="form-grid"><div className="field"><label htmlFor="name">Họ và tên</label><input id="name" name="name" required /></div><div className="field"><label htmlFor="contact">Email hoặc số điện thoại</label><input id="contact" name="contact" required /></div><div className="field"><label htmlFor="branch">Nhánh quan tâm</label><select id="branch" name="branch" defaultValue="chua_biet"><option value="chua_biet">Chưa biết, cần tư vấn</option><option value="cot_song">Tác động cột sống</option><option value="yoga">Yoga</option></select></div><div className="field"><label htmlFor="preferredFormat">Hình thức mong muốn</label><input id="preferredFormat" name="preferredFormat" placeholder="Ví dụ: online, trực tiếp, kết hợp" /></div><div className="field field-full"><label htmlFor="experience">Kinh nghiệm hiện tại</label><input id="experience" name="experience" /></div><div className="field field-full"><label htmlFor="goal">Mục tiêu và câu hỏi của bạn</label><textarea id="goal" name="goal" required minLength={10} /></div><div className="field field-full"><label><input type="checkbox" name="consent" required /> Tôi đồng ý để Mộc Việt sử dụng thông tin này cho việc tư vấn.</label></div></div><button className="button button-dark" disabled={state === 'sending'}>{state === 'sending' ? 'Đang gửi...' : 'Gửi nhu cầu học'}</button>{message && <p className={state === 'error' ? 'status-note' : 'status-note'} role="status">{message}</p>}</form>
}